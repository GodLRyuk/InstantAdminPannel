import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NgForm } from '@angular/forms';
import { Observable } from 'rxjs';
import { RestaurantAdminService } from './restaurant-admin.service';
import {
  AdminRestaurant,
  CashfreeOrderRecord,
  CommissionRecord,
  PaymentSplitRecord,
  RestaurantRefundRecord,
} from './restaurant.models';
import { ADMIN_CSS, errorText } from './restaurants-shared';

@Component({
  selector: 'app-restaurant-payment-records',
  imports: [FormsModule, DatePipe, DecimalPipe],
  styles: [ADMIN_CSS, ':host { padding: 0; } .row-end { justify-content: flex-start; }'],
  template: `
    <div class="bar">
      <button type="button" class="btn" (click)="openForm()" [disabled]="formOpen() || saving() || loading()">
        {{ isCommission ? 'Add commission' : isSplit ? 'Add payment split' : 'Add restaurant refund' }}
      </button>
      <button type="button" class="btn ghost" (click)="load()" [disabled]="loading() || saving()">Refresh records</button>
    </div>

    @if (loadError()) { <p class="err" role="alert">{{ loadError() }}</p> }
    @if (message()) { <p class="ok" role="status">{{ message() }}</p> }

    @if (formOpen()) {
      <form class="card" #form="ngForm" (ngSubmit)="submit(form)" aria-labelledby="payment-form-title">
        <h2 id="payment-form-title">
          {{ isCommission ? 'New vendor commission' : isSplit ? 'Process or sync a payment split' : 'Process or check a cancellation refund' }}
        </h2>
        @if (formError()) { <p class="err" role="alert">{{ formError() }}</p> }
        @if (isCommission) {
          <p class="sub">The rate applies to new restaurant orders from the effective date and time.</p>
          <div class="grid">
            <label class="f">Restaurant
              <select name="restaurant" [(ngModel)]="restaurant" required [disabled]="saving() || loadingRestaurants()">
                <option [ngValue]="null">{{ loadingRestaurants() ? 'Loading restaurants…' : 'Select a restaurant' }}</option>
                @for (item of restaurants(); track item.id) {
                  <option [ngValue]="item.id">{{ item.name }}</option>
                }
              </select>
            </label>
            <label class="f">Commission (%)
              <input name="percentage" type="number" min="0" max="100" step="0.01" required [(ngModel)]="percentage"
                [disabled]="saving()" />
            </label>
            <label class="f">Effective date and time (local)
              <input name="effectiveFrom" type="datetime-local" required [(ngModel)]="effectiveFrom" [disabled]="saving()" />
            </label>
          </div>
        } @else {
          <p class="sub">
            {{ isSplit
              ? 'Enter a paid Cashfree order. The backend calculates the split and submits it when eligible.'
              : 'Enter a cancelled or rejected Cashfree order. Submitting can issue a full refund to the customer.' }}
          </p>
          <label class="f">Order number
            <input name="orderNumber" type="text" placeholder="RO000123" maxlength="32" required
              [(ngModel)]="orderNumber" [disabled]="saving()" />
          </label>
        }
        <div class="row-end">
          <button type="submit" class="btn"
            [disabled]="saving() || loadingRestaurants() || form.invalid || (isCommission ? restaurant === null : !orderNumber.trim())">
            {{ saving() ? 'Submitting…' : isCommission ? 'Save commission' : isSplit ? 'Process or sync split' : 'Process or check refund' }}
          </button>
          <button type="button" class="btn grey" (click)="formOpen.set(false)" [disabled]="saving()">Cancel</button>
        </div>
      </form>
    }

    @if (loading()) {
      <p role="status">Loading records…</p>
    } @else if (isCommission && commissions().length) {
      <div class="wrap">
        <table aria-label="Vendor commission records">
          <thead><tr><th scope="col">Restaurant</th><th scope="col">Commission</th><th scope="col">Effective from</th></tr></thead>
          <tbody>
            @for (item of commissions(); track item.id) {
              <tr><td>{{ item.restaurant_name }}</td><td>{{ item.commission_percentage }}%</td><td>{{ item.effective_from | date:'medium' }}</td></tr>
            }
          </tbody>
        </table>
      </div>
    } @else if (records().length) {
      <div class="wrap">
        <table [attr.aria-label]="isSplit ? 'Recent payment splits' : 'Recent restaurant refunds'">
          <thead>
            <tr>
              <th scope="col">Order</th><th scope="col">Restaurant</th>
              @if (isSplit) {
                <th scope="col">Gross amount (₹)</th><th scope="col">Commission (₹)</th><th scope="col">Vendor amount (₹)</th>
              } @else {
                <th scope="col">Refund amount (₹)</th>
              }
              <th scope="col">Status</th><th scope="col">{{ isSplit ? 'Settlement ID' : 'Cashfree refund ID' }}</th>
            </tr>
          </thead>
          <tbody>
            @for (item of records(); track item.id) {
              <tr>
                <td>{{ item.order_number }}</td><td>{{ item.restaurant_name }}</td>
                @if ('gross_amount' in item) {
                  <td>{{ item.gross_amount | number:'1.2-2' }}</td>
                  <td>{{ item.platform_commission | number:'1.2-2' }} ({{ item.commission_percentage }}%)</td>
                  <td>{{ item.vendor_amount | number:'1.2-2' }}</td>
                } @else {
                  <td>{{ item.amount | number:'1.2-2' }}</td>
                }
                <td>{{ statusLabel(item.status) }}</td><td>{{ item.provider_reference || '—' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else if (!loadError()) {
      <p class="muted">No records yet.</p>
    }
  `,
})
export class RestaurantPaymentRecordsComponent implements OnInit {
  private readonly api = inject(RestaurantAdminService);
  private readonly destroyRef = inject(DestroyRef);
  readonly page = input.required<'commissions' | 'payment-splits' | 'refunds'>();
  readonly formOpen = signal(false);
  readonly loading = signal(false);
  readonly loadingRestaurants = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal('');
  readonly formError = signal('');
  readonly message = signal('');
  readonly restaurants = signal<AdminRestaurant[]>([]);
  readonly commissions = signal<CommissionRecord[]>([]);
  readonly records = signal<(PaymentSplitRecord | RestaurantRefundRecord)[]>([]);

  restaurant: number | null = null;
  percentage: number | null = null;
  effectiveFrom = '';
  orderNumber = '';

  get isCommission(): boolean { return this.page() === 'commissions'; }
  get isSplit(): boolean { return this.page() === 'payment-splits'; }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (this.loading() || this.saving()) return;
    this.loading.set(true);
    this.loadError.set('');
    const request: Observable<(CommissionRecord | PaymentSplitRecord | RestaurantRefundRecord)[]> =
      this.isCommission ? this.api.commissions() : this.isSplit ? this.api.paymentSplits() : this.api.refunds();
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: rows => {
        this.commissions.set(rows.filter(row => 'effective_from' in row));
        this.records.set(rows.filter(row => 'order_number' in row));
        this.loading.set(false);
      },
      error: err => {
        this.loadError.set(errorText(err));
        this.loading.set(false);
      },
    });
  }

  openForm(): void {
    this.restaurant = null;
    this.percentage = null;
    const now = new Date();
    this.effectiveFrom = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
    this.orderNumber = '';
    this.message.set('');
    this.formError.set('');
    this.formOpen.set(true);
    if (!this.isCommission || this.restaurants().length || this.loadingRestaurants()) return;

    this.loadingRestaurants.set(true);
    this.api.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: restaurants => {
        this.restaurants.set(restaurants);
        this.loadingRestaurants.set(false);
        if (!restaurants.length) this.formError.set('Add a restaurant before setting its commission.');
      },
      error: err => {
        this.formError.set(errorText(err));
        this.loadingRestaurants.set(false);
      },
    });
  }

  submit(form: NgForm): void {
    if (form.invalid || this.saving() || this.loading() || !this.formOpen()) return;
    this.formError.set('');
    this.message.set('');
    if (this.isCommission) {
      this.saveCommission();
      return;
    }

    const orderNumber = this.orderNumber.trim();
    if (!orderNumber) return;
    this.saving.set(true);
    const request: Observable<PaymentSplitRecord | RestaurantRefundRecord> = this.isSplit
      ? this.api.submitSplit(orderNumber)
      : this.api.submitRefund(orderNumber);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: record => {
        this.saving.set(false);
        this.records.update(rows => [record, ...rows.filter(row => row.id !== record.id)]);
        if (record.cashfree_error || record.status === 'failed') {
          this.formError.set(`Cashfree did not confirm the operation for ${record.order_number}. Current status: ${this.statusLabel(record.status)}.`);
          return;
        }
        this.formOpen.set(false);
        this.message.set(this.describe(record));
      },
      error: err => this.handleSaveError(err),
    });
  }

  private saveCommission(): void {
    const effectiveDate = new Date(this.effectiveFrom);
    if (this.restaurant === null || this.percentage === null || !Number.isFinite(effectiveDate.getTime())) return;
    if (this.percentage < 0 || this.percentage > 100 || Number(this.percentage.toFixed(2)) !== this.percentage) {
      this.formError.set('Enter a commission from 0 to 100 with at most two decimal places.');
      return;
    }
    this.saving.set(true);
    this.api.addCommission({
      restaurant: this.restaurant,
      commission_percentage: this.percentage,
      effective_from: effectiveDate.toISOString(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: record => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.commissions.update(rows => [record, ...rows.filter(row => row.id !== record.id)]
          .sort((a, b) => Date.parse(b.effective_from) - Date.parse(a.effective_from) || b.id - a.id));
        this.message.set('Commission saved.');
      },
      error: err => this.handleSaveError(err),
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.formError.set(errorText(error));
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'submitted': return 'Submitted to Cashfree';
      case 'success': return 'Refunded';
      default: return status.replaceAll('_', ' ').replace(/^./, first => first.toUpperCase());
    }
  }

  private describe(record: CashfreeOrderRecord): string {
    if (record.status === 'pending') {
      const pending = this.isSplit
        ? 'The split is pending. Cashfree requires a two-minute wait after payment.'
        : 'The refund is pending. Check again after any split processing finishes.';
      return `${record.order_number} — ${pending}`;
    }
    return `${record.order_number} — ${this.statusLabel(record.status)}.`;
  }
}
