import { CurrencyPipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { RestaurantAdminService } from './restaurant-admin.service';
import { PartnerMenuItem } from './restaurant.models';
import { ADMIN_CSS, errorText } from './restaurants-shared';

interface SalesTotals {
  sales: number;
  orders: number;
  units: number;
}

interface SalesReport {
  total: SalesTotals;
  daily: SalesRow[];
  items: SalesRow[];
}

interface SalesRow extends SalesTotals {
  label: string;
}

@Component({
  selector: 'app-restaurant-sales-report',
  imports: [CurrencyPipe, DecimalPipe, NgTemplateOutlet, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [ADMIN_CSS, `
    .report-section { margin-top: 20px; }
    .metric { margin: 0; }
    .metric dd { font-size: 24px; font-weight: 600; margin: 4px 0 0; }
  `],
  template: `
    <h1>Sales Report</h1>
    <p class="sub">Gross item sales in INR for paid, delivered orders. Includes add-ons before discounts, taxes, packaging and delivery fees.</p>

    <form class="card" [formGroup]="form" (ngSubmit)="loadReport()">
      <div class="grid">
        <label class="f">Start date <input type="date" formControlName="start_date" /></label>
        <label class="f">End date <input type="date" formControlName="end_date" /></label>
        <label class="f">Menu item
          <input type="text" inputmode="numeric" list="report-menu-items"
            formControlName="product_id" placeholder="All menu items" />
          <datalist id="report-menu-items">
            @for (item of menuItems(); track item.id) {
              <option [value]="item.id" [label]="item.name"></option>
            }
          </datalist>
        </label>
      </div>
      <p class="muted">Both dates are inclusive and use the order creation date in Asia/Kolkata.</p>
      <div class="actions">
        <button class="btn" type="submit" [disabled]="loading()">Apply filters</button>
        <button class="btn ghost" type="button" [disabled]="loading()" (click)="clearFilters()">Clear filters</button>
      </div>
    </form>

    @if (error()) {
      <p class="err" role="alert">{{ error() }}</p>
    }
    @if (loading()) {
      <p class="muted" role="status">Loading sales report…</p>
    }
    @if (report(); as result) {
      <div class="grid">
        <dl class="card metric"><dt>Total gross sales</dt><dd>{{ result.total.sales | currency:'INR':'symbol':'1.2-2' }}</dd></dl>
        <dl class="card metric"><dt>Orders</dt><dd>{{ result.total.orders | number }}</dd></dl>
        <dl class="card metric"><dt>Units sold</dt><dd>{{ result.total.units | number }}</dd></dl>
      </div>

      <section class="report-section" aria-labelledby="daily-sales">
        <h2 id="daily-sales">Daily sales</h2>
        <ng-container [ngTemplateOutlet]="salesTable"
          [ngTemplateOutletContext]="{ rows: result.daily, label: 'Date', heading: 'daily-sales' }" />
      </section>
      <section class="report-section" aria-labelledby="item-sales">
        <h2 id="item-sales">Sales by menu item</h2>
        <ng-container [ngTemplateOutlet]="salesTable"
          [ngTemplateOutletContext]="{ rows: result.items, label: 'Menu item', heading: 'item-sales' }" />
      </section>
    }

    <ng-template #salesTable let-rows="rows" let-label="label" let-heading="heading">
      @if (rows.length) {
        <div class="wrap">
          <table [attr.aria-labelledby]="heading">
            <thead><tr>
              <th scope="col">{{ label }}</th><th scope="col">Gross sales</th>
              <th scope="col">Orders</th><th scope="col">Units sold</th>
            </tr></thead>
            <tbody>
              @for (row of rows; track $index) {
                <tr>
                  <th scope="row">{{ row.label }}</th>
                  <td>{{ row.sales | currency:'INR':'symbol':'1.2-2' }}</td>
                  <td>{{ row.orders | number }}</td>
                  <td>{{ row.units | number }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <p class="muted">No sales match these filters.</p>
      }
    </ng-template>
  `,
})
export class RestaurantSalesReportComponent implements OnInit {
  private readonly api = inject(RestaurantAdminService);
  private readonly destroyRef = inject(DestroyRef);
  readonly form = inject(FormBuilder).nonNullable.group({
    start_date: '',
    end_date: '',
    product_id: ['', Validators.pattern(/^[1-9]\d*$/)],
  });
  readonly report = signal<SalesReport | null>(null);
  readonly menuItems = signal<PartnerMenuItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');

  ngOnInit(): void {
    this.loadReport();
    this.api.menuItems().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => this.menuItems.set(Array.isArray(response) ? response : response.results),
      error: () => this.menuItems.set([]),
    });
  }

  clearFilters(): void {
    this.form.reset();
    this.loadReport();
  }

  loadReport(): void {
    if (this.loading()) return;
    this.error.set('');
    this.report.set(null);
    const filters = this.form.getRawValue();
    if (this.form.invalid) {
      this.error.set('Enter a positive menu item ID.');
      return;
    }
    if (filters.start_date && filters.end_date && filters.start_date > filters.end_date) {
      this.error.set('Start date must be on or before end date.');
      return;
    }

    this.loading.set(true);
    this.api.salesReport(filters).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: response => {
        const report = parseReport(response);
        if (report) {
          this.report.set(report);
        } else {
          this.error.set('The server returned an unexpected sales report format.');
        }
      },
      error: err => this.error.set(errorText(err)),
    });
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function metric(value: unknown): number | null {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseTotals(value: unknown): SalesTotals | null {
  const data = record(value);
  if (!data) return null;
  const sales = metric(data['gross_item_sales'] ?? data['total_sales'] ?? data['gross_sales'] ?? data['sales']);
  const orders = metric(data['order_count'] ?? data['total_orders'] ?? data['orders']);
  const units = metric(data['units_sold'] ?? data['total_units_sold']);
  return sales === null || orders === null || units === null ? null : { sales, orders, units };
}

function parseRows(value: unknown, labelFor: (row: Record<string, unknown>) => unknown): SalesRow[] | null {
  if (!Array.isArray(value)) return null;
  const rows: SalesRow[] = [];
  for (const entry of value) {
    const data = record(entry);
    const totals = parseTotals(entry);
    if (!data || !totals) return null;
    const label = labelFor(data);
    if (typeof label !== 'string' && typeof label !== 'number') return null;
    rows.push({ label: String(label), ...totals });
  }
  return rows;
}

function parseReport(value: unknown): SalesReport | null {
  const data = record(value);
  if (!data) return null;
  const total = parseTotals(data['totals'] ?? data['summary'] ?? data);
  const daily = parseRows(data['daily_sales'], row => row['date']);
  const items = parseRows(data['sales_by_menu_item'] ?? data['sales_by_item'] ?? data['sales_by_product'],
    row => row['menu_item_name'] ?? row['product_name'] ?? row['name'] ?? row['product_id']);
  return total && daily && items ? { total, daily, items } : null;
}
