import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RestaurantAdminService } from './restaurant-admin.service';
import { AdminRestaurant } from './restaurant.models';
import { ADMIN_CSS, errorText } from './restaurants-shared';

type Pending = { restaurant: AdminRestaurant; action: 'reject' | 'suspend' };

@Component({
  selector: 'app-restaurants-list',
  imports: [FormsModule, RouterLink],
  styles: [ADMIN_CSS],
  template: `
    <div class="bar" style="justify-content: space-between">
      <div>
        <h1>Restaurants</h1>
        <p class="sub">Approve new restaurants, set their delivery fee and watch their status.</p>
      </div>
      <div class="actions">
        <a class="btn ghost" routerLink="orders">Orders</a>
        <a class="btn" routerLink="new">+ Add restaurant</a>
      </div>
    </div>

    <div class="bar">
      <div class="tabs">
        @for (t of tabs; track t.key) {
          <button type="button" class="tab" [class.on]="status === t.key" (click)="setTab(t.key)">
            {{ t.label }}
          </button>
        }
      </div>
      <input type="search" placeholder="Search by name" [(ngModel)]="search" (keyup.enter)="load()" />
      <button type="button" class="btn grey" (click)="load()">Search</button>
    </div>

    @if (error()) {
      <div class="err">{{ error() }}</div>
    }

    <div class="wrap">
      <table>
        <thead>
          <tr>
            <th>Restaurant</th>
            <th>Owner</th>
            <th>City</th>
            <th>Status</th>
            <th>Orders</th>
            <th>Delivery fee</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (r of restaurants(); track r.id) {
            <tr>
              <td>
                <strong>{{ r.name }}</strong><br />
                <span class="muted">{{ r.phone }} · FSSAI {{ r.fssai_number || '-' }}</span>
              </td>
              <td>{{ r.owner_name }}</td>
              <td>{{ r.city }}</td>
              <td>
                <span class="badge" [class]="'badge ' + r.status">{{ r.status }}</span>
                @if (r.status === 'rejected' && r.rejection_reason) {
                  <div class="muted">{{ r.rejection_reason }}</div>
                }
              </td>
              <td>
                @if (r.status === 'approved') {
                  {{ r.is_open_now ? 'Open now' : r.is_accepting_orders ? 'Closed (hours)' : 'Paused' }}
                } @else {
                  <span class="muted">-</span>
                }
              </td>
              <td>₹{{ r.delivery_fee }}</td>
              <td>
                <div class="actions">
                  @if (r.status !== 'approved') {
                    <button type="button" class="btn sm" [disabled]="busy()" (click)="approve(r)">Approve</button>
                  }
                  @if (r.status === 'pending') {
                    <button type="button" class="btn sm red" (click)="ask(r, 'reject')">Reject</button>
                  }
                  @if (r.status === 'approved') {
                    <button type="button" class="btn sm red" (click)="ask(r, 'suspend')">Suspend</button>
                  }
                  <a class="btn sm ghost" [routerLink]="[r.id]">Edit</a>
                </div>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="7" class="muted">
                {{ loading() ? 'Loading...' : 'No restaurants found.' }}
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    @if (pending(); as p) {
      <div class="shade" (click)="pending.set(null)">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>{{ p.action === 'reject' ? 'Reject' : 'Suspend' }} {{ p.restaurant.name }}</h3>
          <p class="muted">
            {{ p.action === 'reject' ? 'The owner will see this reason.' : 'The restaurant disappears from the app until you approve it again.' }}
          </p>
          <textarea [(ngModel)]="reason" placeholder="Reason"></textarea>
          <div class="row-end">
            <button type="button" class="btn grey" (click)="pending.set(null)">Cancel</button>
            <button type="button" class="btn red" [disabled]="busy() || (p.action === 'reject' && !reason.trim())" (click)="confirm()">
              {{ p.action === 'reject' ? 'Reject' : 'Suspend' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class RestaurantsListComponent implements OnInit {
  private api = inject(RestaurantAdminService);

  tabs = [
    { key: '', label: 'All' },
    { key: 'pending', label: 'Pending approval' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'suspended', label: 'Suspended' },
  ];
  status = 'pending';
  search = '';
  reason = '';

  restaurants = signal<AdminRestaurant[]>([]);
  loading = signal(false);
  busy = signal(false);
  error = signal('');
  pending = signal<Pending | null>(null);

  ngOnInit() {
    this.load();
  }

  setTab(key: string) {
    this.status = key;
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api.list({ status: this.status, q: this.search.trim() }).subscribe({
      next: (rows) => {
        this.restaurants.set(rows);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorText(e));
        this.loading.set(false);
      },
    });
  }

  approve(r: AdminRestaurant) {
    this.run(this.api.approve(r.id));
  }

  ask(restaurant: AdminRestaurant, action: 'reject' | 'suspend') {
    this.reason = '';
    this.pending.set({ restaurant, action });
  }

  confirm() {
    const p = this.pending();
    if (!p) return;
    const call =
      p.action === 'reject'
        ? this.api.reject(p.restaurant.id, this.reason.trim())
        : this.api.suspend(p.restaurant.id, this.reason.trim());
    this.run(call, () => this.pending.set(null));
  }

  private run(call: ReturnType<RestaurantAdminService['approve']>, done?: () => void) {
    this.busy.set(true);
    this.error.set('');
    call.subscribe({
      next: () => {
        this.busy.set(false);
        done?.();
        this.load();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(errorText(e));
        done?.();
      },
    });
  }
}
