import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { RestaurantAdminService } from './restaurant-admin.service';
import {
  AdminRestaurant,
  FINAL_STATUSES,
  NEXT_STATUSES,
  OWNER_NEXT_STATUSES,
  RestaurantOrder,
  STATUS_BUTTON_LABEL,
} from './restaurant.models';
import { ADMIN_CSS, errorText } from './restaurants-shared';
import {
  escapeReceiptText,
  formatReceiptCurrency,
  formatReceiptDate,
  printThermalReceipt,
} from '../shared/thermal-receipt';

@Component({
  selector: 'app-restaurant-orders',
  imports: [FormsModule, RouterLink, DatePipe, DecimalPipe],
  styles: [ADMIN_CSS],
  template: `
    <div class="bar" style="justify-content: space-between">
      <div>
        <h1>Restaurant orders</h1>
        <p class="sub">Refreshes every 30 seconds. Click a row to see the items and address.</p>
      </div>
      <a class="btn ghost" routerLink="/restaurants">Restaurants</a>
    </div>

    @if (isOwner) {
      <section class="card" aria-label="Order filters">
        <div class="bar" style="justify-content: space-between">
          <div>
            <h2>Filter orders</h2>
            <p class="muted">Choose one or more statuses</p>
          </div>
          <button
            type="button"
            class="btn grey sm"
            [disabled]="ownerStatuses.length === 0 && !activeOnly"
            (click)="clearOwnerFilters()"
          >Clear filters</button>
        </div>
        <div class="bar" style="justify-content: space-between">
          <div class="tabs" role="group" aria-label="Filter orders by status">
            @for (s of ownerStatusOptions; track s) {
              <button
                type="button"
                class="tab"
                [class.on]="ownerStatuses.includes(s)"
                [attr.aria-pressed]="ownerStatuses.includes(s)"
                (click)="toggleOwnerStatus(s)"
              >{{ label(s) }}</button>
            }
          </div>
          <div class="bar">
            <label class="chk">
              <input type="checkbox" [(ngModel)]="activeOnly" (ngModelChange)="load()" />
              Active orders only
            </label>
            <button type="button" class="btn grey" (click)="load()">Refresh</button>
          </div>
        </div>
      </section>
    } @else {
      <div class="bar">
        <select [(ngModel)]="status" (ngModelChange)="load()" aria-label="Filter by status">
          <option value="">All statuses</option>
          @for (s of statusOptions; track s) {
            <option [value]="s">{{ s }}</option>
          }
        </select>
        <select [(ngModel)]="restaurantId" (ngModelChange)="load()" aria-label="Filter by restaurant">
          <option [ngValue]="null">All restaurants</option>
          @for (r of restaurants(); track r.id) {
            <option [ngValue]="r.id">{{ r.name }}</option>
          }
        </select>
        <label class="chk">
          <input type="checkbox" [(ngModel)]="activeOnly" (ngModelChange)="load()" /> Active only
        </label>
        <button type="button" class="btn grey" (click)="load()">Refresh</button>
      </div>
    }

    @if (error()) {
      <div class="err">{{ error() }}</div>
    }

    <div class="wrap">
      <table>
        <thead>
          <tr>
            <th>Order</th>
            <th>Restaurant</th>
            <th>Customer</th>
            <th>Total</th>
            <th>Payment</th>
            <th>Status</th>
            <th>Placed</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (o of orders(); track o.id) {
            <tr class="click" (click)="toggle(o.id)">
              <td><strong>{{ o.order_number }}</strong></td>
              <td>{{ o.restaurant.name }}</td>
              <td>{{ o.customer_name }}<br /><span class="muted">{{ o.customer_phone }}</span></td>
              <td>₹{{ o.total_amount | number: '1.0-2' }}</td>
              <td>
                {{ o.payment_method === 'cod' ? 'COD' : 'Online' }}<br />
                <span class="badge" [class]="'badge ' + o.payment_status">{{ o.payment_status_label }}</span>
              </td>
              <td><span class="badge" [class]="'badge ' + o.status">{{ o.status_label }}</span></td>
              <td>{{ o.created_at | date: 'dd MMM, h:mm a' }}</td>
              <td (click)="$event.stopPropagation()">
                <div class="actions">
                  <button type="button" class="btn sm grey" (click)="printReceipt(o)" [attr.aria-label]="'Print bill for order ' + o.order_number">Print bill</button>
                  @for (next of nextStatuses(o); track next) {
                    <button type="button" class="btn sm" [class.red]="next === 'rejected'" [disabled]="busy()" (click)="change(o, next)">
                      {{ label(next) }}
                    </button>
                  }
                  @if (canCancel(o)) {
                    <button type="button" class="btn sm grey" [disabled]="busy()" (click)="change(o, 'cancelled')">Cancel</button>
                  }
                </div>
              </td>
            </tr>
            @if (expanded() === o.id) {
              <tr class="detail">
                <td colspan="8">
                  <div class="grid">
                    <div>
                      <strong>Items</strong>
                      @for (i of o.items; track i.id) {
                        <div>{{ i.quantity }} × {{ i.name }} <span class="muted">₹{{ i.line_total | number: '1.0-2' }}</span></div>
                      }
                      @if (o.notes) {
                        <p class="muted">Note: {{ o.notes }}</p>
                      }
                    </div>
                    <div>
                      <strong>Bill</strong>
                      <div>Items ₹{{ o.item_total | number: '1.0-2' }}</div>
                      <div>Discount −₹{{ o.discount | number: '1.0-2' }} {{ o.offer_code }}</div>
                      <div>Delivery ₹{{ o.delivery_fee | number: '1.0-2' }}</div>
                      <div>Packaging ₹{{ o.packaging_charge | number: '1.0-2' }}</div>
                      <div>GST ₹{{ o.gst | number: '1.0-2' }}</div>
                    </div>
                    <div>
                      <strong>Deliver to</strong>
                      <div>{{ addressText(o) }}</div>
                      <div class="muted">Restaurant phone: {{ o.restaurant.phone }}</div>
                      @if (o.rejection_reason) {
                        <p class="muted">Reason: {{ o.rejection_reason }}</p>
                      }
                    </div>
                  </div>
                </td>
              </tr>
            }
          } @empty {
            <tr><td colspan="8" class="muted">{{ loading() ? 'Loading...' : 'No orders.' }}</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (pending(); as p) {
      <div class="shade" (click)="pending.set(null)">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>{{ label(p.status) }} {{ p.order.order_number }}</h3>
          @if (p.order.payment_method === 'online' && p.order.payment_status === 'paid') {
            @if (!isOwner) {
              <p class="muted">This order is paid online. It will be marked "refund pending". Refund it in the Razorpay dashboard.</p>
            }
          }
          <textarea [(ngModel)]="reason" placeholder="Reason (shown to the customer)"></textarea>
          <div class="row-end">
            <button type="button" class="btn grey" (click)="pending.set(null)">Back</button>
            <button type="button" class="btn red" [disabled]="busy()" (click)="confirm()">{{ label(p.status) }}</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class RestaurantOrdersComponent implements OnInit {
  private api = inject(RestaurantAdminService);
  private auth = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  isOwner = this.auth.isRestaurant();

  statusOptions = [
    'awaiting_payment', 'placed', 'accepted', 'preparing', 'ready',
    'out_for_delivery', 'delivered', 'rejected', 'cancelled',
  ];
  ownerStatusOptions = ['placed', 'accepted', 'preparing', 'ready', 'rejected', 'cancelled', 'delivered'];
  ownerStatuses: string[] = [];
  status = '';
  restaurantId: number | null = null;
  activeOnly = false;
  reason = '';

  orders = signal<RestaurantOrder[]>([]);
  restaurants = signal<AdminRestaurant[]>([]);
  expanded = signal<number | null>(null);
  loading = signal(false);
  busy = signal(false);
  error = signal('');
  pending = signal<{ order: RestaurantOrder; status: string } | null>(null);

  ngOnInit() {
    if (!this.isOwner) {
      this.api.list({ status: 'approved' }).subscribe((r) => this.restaurants.set(r));
    }
    this.load();
    const timer = setInterval(() => this.load(true), 30000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  toggleOwnerStatus(status: string) {
    this.ownerStatuses = this.ownerStatuses.includes(status)
      ? this.ownerStatuses.filter((selected) => selected !== status)
      : [...this.ownerStatuses, status];
    this.load();
  }

  clearOwnerFilters() {
    this.ownerStatuses = [];
    this.activeOnly = false;
    this.load();
  }

  load(quiet = false) {
    if (!quiet) this.loading.set(true);
    const request = this.isOwner
      ? this.api.partnerOrders({
          status: this.ownerStatuses.join(','),
          active: this.activeOnly && this.ownerStatuses.length === 0,
        })
      : this.api.orders({
          status: this.status,
          restaurant: this.restaurantId,
          active: this.activeOnly && !this.status,
        });
    request
      .subscribe({
        next: (rows) => {
          this.orders.set(rows);
          this.loading.set(false);
          if (!quiet) this.error.set('');
        },
        error: (e) => {
          this.loading.set(false);
          if (!quiet) this.error.set(errorText(e));
        },
      });
  }

  toggle(id: number) {
    this.expanded.set(this.expanded() === id ? null : id);
  }

  nextStatuses(o: RestaurantOrder): string[] {
    return this.isOwner
      ? OWNER_NEXT_STATUSES[o.status] ?? []
      : NEXT_STATUSES[o.status] ?? [];
  }

  canCancel(o: RestaurantOrder) {
    return !this.isOwner && !FINAL_STATUSES.includes(o.status);
  }

  label(status: string) {
    return STATUS_BUTTON_LABEL[status] ?? status;
  }

  addressText(o: RestaurantOrder): string {
    const a = o.delivery_address ?? {};
    const skip = ['id', 'user', 'lat', 'lng', 'name', 'phone', 'is_default'];
    const parts = Object.entries(a)
      .filter(([k, v]) => !skip.includes(k) && v !== null && v !== '')
      .map(([, v]) => String(v));
    return parts.length ? parts.join(', ') : '-';
  }

  printReceipt(order: RestaurantOrder) {
    const items = order.items.map(item => `
      <div class="item">
        <div>${escapeReceiptText(item.quantity)} × ${escapeReceiptText(item.name)}</div>
        <div class="row">
          <span>${formatReceiptCurrency(item.unit_price)} each</span>
          <strong>${formatReceiptCurrency(item.line_total)}</strong>
        </div>
      </div>
    `).join('');

    const restaurant = order.restaurant;
    printThermalReceipt(`${restaurant.name} - Order ${order.order_number}`, async () => {
      const details = this.restaurants().find(entry => entry.id === restaurant.id)
        ?? (restaurant.address_line ? restaurant : await firstValueFrom(
          this.isOwner ? this.api.getOwnerRestaurant(restaurant.id) : this.api.get(restaurant.id)
        ));
      const address = [details.address_line, details.city, details.pincode].filter(Boolean).join(', ');

      return `
        <h1>${escapeReceiptText(restaurant.name)}</h1>
        ${address ? `<p class="center">${escapeReceiptText(address)}</p>` : ''}
        <p class="center muted">${escapeReceiptText(order.restaurant.phone)}</p>
        <div class="divider"></div>
        <p>Order: ${escapeReceiptText(order.order_number)}</p>
        <p>Date: ${formatReceiptDate(order.created_at)}</p>
        <p>Customer: ${escapeReceiptText(order.customer_name)}</p>
        <p>Customer phone: ${escapeReceiptText(order.customer_phone)}</p>
        <div class="divider"></div>
        <h2>Items</h2>
        ${items}
        <div class="divider"></div>
        <div class="row"><span>Items</span><span>${formatReceiptCurrency(order.item_total)}</span></div>
        <div class="row"><span>Discount${order.offer_code ? ` (${escapeReceiptText(order.offer_code)})` : ''}</span><span>−${formatReceiptCurrency(order.discount)}</span></div>
        <div class="row"><span>Delivery</span><span>${formatReceiptCurrency(order.delivery_fee)}</span></div>
        <div class="row"><span>Packaging</span><span>${formatReceiptCurrency(order.packaging_charge)}</span></div>
        <div class="row"><span>GST</span><span>${formatReceiptCurrency(order.gst)}</span></div>
        <div class="row total"><span>Total</span><span>${formatReceiptCurrency(order.total_amount)}</span></div>
        <div class="divider"></div>
        <p>Payment mode: ${escapeReceiptText(order.payment_method_label || (order.payment_method === 'cod' ? 'Cash on delivery' : 'Online'))}</p>
        <p>Status: ${escapeReceiptText(order.status_label)}</p>
        <p>Deliver to: ${escapeReceiptText(this.addressText(order))}</p>
        ${order.notes ? `<p>Note: ${escapeReceiptText(order.notes)}</p>` : ''}
        <p class="center">Thank you</p>
      `;
    });
  }

  change(order: RestaurantOrder, status: string) {
    if (status === 'rejected' || status === 'cancelled') {
      this.reason = '';
      this.pending.set({ order, status });
      return;
    }
    this.send(order, status);
  }

  confirm() {
    const p = this.pending();
    if (p) this.send(p.order, p.status, this.reason.trim(), () => this.pending.set(null));
  }

  private send(order: RestaurantOrder, status: string, reason = '', done?: () => void) {
    this.busy.set(true);
    const request = this.isOwner
      ? this.api.setPartnerOrderStatus(order.id, status, reason || undefined)
      : this.api.setOrderStatus(order.id, status, reason);
    request.subscribe({
      next: () => {
        this.busy.set(false);
        done?.();
        this.load(true);
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(errorText(e));
        done?.();
      },
    });
  }
}
