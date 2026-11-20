import { RestaurantVendorsComponent } from './restaurant-vendors.component';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RestaurantPaymentRecordsComponent } from './restaurant-payment-records.component';
import { AuthService } from '../services/auth.service';
import { RestaurantAdminService } from './restaurant-admin.service';
import { ADMIN_CSS, errorText } from './restaurants-shared';

type Action = 'splits' | 'sync' | 'refunds';

@Component({
  selector: 'app-restaurant-payments',
  standalone: true,
  imports: [RouterLink, RestaurantVendorsComponent, RestaurantPaymentRecordsComponent],
  styles: [ADMIN_CSS],
  template: `
    @if (authorized) {
      <h1>{{ title }}</h1>
      <nav class="bar" aria-label="Restaurant payments">
        @for (tab of tabs; track tab.path) {
          <a class="btn ghost" [routerLink]="['/restaurants', tab.path]">{{ tab.label }}</a>
        }
      </nav>
      @if (error()) { <div class="err" role="alert">{{ error() }}</div> }
      @if (message()) { <div class="ok" role="status">{{ message() }}</div> }

      @if (page === 'vendor-onboarding') {
        <app-restaurant-vendors />
      }

      @if (page === 'commissions' || page === 'payment-splits' || page === 'refunds') {
        <app-restaurant-payment-records [page]="page" />
      }
      @if (page === 'payment-operations') {
        <p class="sub">Run payment operations across eligible records. Backend staff permissions apply to every request.</p>
        <div class="grid">
          @for (operation of operations; track operation.key) {
            <div class="card">
              <h2>{{ operation.label }}</h2>
              <p>{{ operation.description }}</p>
              <button type="button" class="btn" [disabled]="busy()" (click)="prepare(operation.key)">{{ operation.label }}</button>
            </div>
          }
        </div>
        @if (pending(); as action) {
          <div class="card" role="group" aria-labelledby="confirm-payment-action">
            <h2 id="confirm-payment-action">Confirm {{ actionLabel(action) }}</h2>
            <p>This requests processing for eligible records. Review current records in Payment splits or Refunds before continuing.</p>
            <div class="actions">
              <button type="button" class="btn grey" [disabled]="busy()" (click)="pending.set(null)">Cancel</button>
              <button type="button" class="btn" [disabled]="busy()" (click)="run()">{{ busy() ? 'Processing…' : 'Confirm and run' }}</button>
            </div>
          </div>
        }
      }
    }
  `,
})
export class RestaurantPaymentsComponent {
  private api = inject(RestaurantAdminService);
  private auth = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  readonly authorized = this.auth.isAuthenticated() && this.auth.isStaff() && !this.auth.isRestaurant();
  readonly page = inject(ActivatedRoute).snapshot.routeConfig?.path || '';
  readonly tabs = [
    { path: 'vendor-onboarding', label: 'Vendor onboarding' },
    { path: 'commissions', label: 'Vendor commissions' },
    { path: 'payment-splits', label: 'Payment splits' },
    { path: 'refunds', label: 'Restaurant refunds' },
    { path: 'payment-operations', label: 'Operations' },
  ];
  readonly title = this.tabs.find(tab => tab.path === this.page)?.label || 'Restaurant payments';
  readonly operations: { key: Action; label: string; description: string }[] = [
    { key: 'splits', label: 'Process splits', description: 'Request split processing for eligible restaurant payments.' },
    { key: 'sync', label: 'Sync settlements', description: 'Sync settlement statuses from Cashfree.' },
    { key: 'refunds', label: 'Process refunds', description: 'Request processing of eligible cancellation refunds.' },
  ];
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly pending = signal<Action | null>(null);
  actionLabel(action: Action): string {
    return this.operations.find(operation => operation.key === action)!.label;
  }

  prepare(action: Action): void {
    if (!this.authorized || this.busy()) return;
    this.error.set('');
    this.message.set('');
    this.pending.set(action);
  }

  run(): void {
    const action = this.pending();
    if (!this.authorized || !action || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    this.api.processPayments(action).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: result => {
        this.busy.set(false);
        this.pending.set(null);
        const counts = action === 'sync'
          ? `Synced: ${result.synced}. Failed: ${result.failed}.`
          : `Processed: ${result.processed}. Failed: ${result.failed}.${action === 'refunds' ? ` Synced: ${result.synced}.` : ''}`;
        this.message.set(`${this.actionLabel(action)} completed. ${counts}`);
      },
      error: err => {
        this.busy.set(false);
        this.pending.set(null);
        // A timed-out POST may still have executed: never retry automatically.
        this.error.set(`${errorText(err)} Refresh the payment records and check their statuses before retrying.`);
      },
    });
  }
}
