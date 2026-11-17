import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../services/auth.service';
import { RestaurantAdminService } from './restaurant-admin.service';
import { AdminRestaurant, RestaurantVendor, VendorOnboardingPayload } from './restaurant.models';
import { ADMIN_CSS } from './restaurants-shared';

export function maskVendorAccount(last4: string): string {
  const digits = (last4 || '').replace(/\D/g, '');
  return digits ? `•••• ${digits.slice(-4)}` : 'Not provided';
}

const emptyDetails = () => ({ account_number: '', ifsc_code: '', account_holder_name: '', pan: '', business_type: '', gstin: '' });

@Component({
  selector: 'app-restaurant-vendors',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  styles: [ADMIN_CSS],
  template: `
    @if (authorized) {
      <p class="sub">Register a restaurant’s Cashfree vendor using its bank and business KYC details.</p>
      @if (error()) { <div class="err" role="alert">{{ error() }}</div> }
      @if (message()) { <div class="ok" role="status">{{ message() }}</div> }
      <div class="bar">
        <button class="btn ghost" type="button" (click)="loadVendors()" [disabled]="loading() || saving()">Refresh vendors</button>
        <a class="btn ghost" routerLink="/restaurants/new">Add restaurant</a>
      </div>
      @if (listError()) { <p class="err" role="alert">{{ listError() }}</p> }
      @if (loading()) { <p role="status">Loading vendors…</p> }
      @else if (!listError()) {
        <div class="wrap"><table>
          <thead><tr><th scope="col">Restaurant</th><th scope="col">Cashfree vendor ID</th><th scope="col">Verification</th><th scope="col">Settlement</th><th scope="col">Bank account</th><th scope="col">IFSC</th><th scope="col">Updated</th></tr></thead>
          <tbody>
            @for (vendor of vendors(); track vendor.id) {
              <tr><td>{{ vendor.restaurant_name }}</td><td>{{ vendor.cashfree_vendor_id || 'Not assigned' }}</td>
                <td>{{ vendor.verification_status }}</td><td>{{ vendor.settlement_status }}</td>
                <td>{{ mask(vendor.bank_account_last4) }}</td><td>{{ vendor.ifsc_code }}</td><td>{{ vendor.updated_at | date:'medium' }}</td></tr>
            } @empty { <tr><td colspan="7">No restaurant vendors found.</td></tr> }
          </tbody>
        </table></div>
      }
      <form #vendorForm="ngForm" class="card" autocomplete="off" (ngSubmit)="submit(vendorForm)">
        <h2>Add or retry vendor registration</h2>
        @if (restaurantsError()) {
          <p class="err" role="alert">{{ restaurantsError() }}</p>
          <button type="button" class="btn ghost" (click)="loadRestaurants()" [disabled]="restaurantsLoading()">Reload restaurants</button>
        }
        <fieldset [disabled]="saving() || restaurantsLoading()" style="border: 0; padding: 0; min-width: 0">
          <div class="grid">
            <label class="f">Restaurant
              <select name="restaurant_id" required [(ngModel)]="restaurantId" (ngModelChange)="selectionChanged()">
                <option [ngValue]="null">Select restaurant</option>
                @for (restaurant of restaurants(); track restaurant.id) { <option [ngValue]="restaurant.id">{{ restaurant.name }} (#{{ restaurant.id }})</option> }
              </select>
            </label>
            <label class="f">Account number<input name="account_number" type="password" inputmode="numeric" required pattern="[0-9]+" autocomplete="off" [(ngModel)]="details.account_number" /></label>
            <label class="f">IFSC code<input name="ifsc_code" required pattern="[A-Za-z]{4}0[A-Za-z0-9]{6}" maxlength="11" [(ngModel)]="details.ifsc_code" /></label>
            <label class="f">Account holder name<input name="account_holder_name" required [(ngModel)]="details.account_holder_name" /></label>
            <label class="f">PAN<input name="pan" type="password" required pattern="[A-Za-z]{5}[0-9]{4}[A-Za-z]" maxlength="10" autocomplete="off" [(ngModel)]="details.pan" /></label>
            <label class="f">Business type<input name="business_type" required [(ngModel)]="details.business_type" /></label>
            <label class="f">GSTIN (optional)<input name="gstin" type="password" pattern="[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][A-Za-z0-9][Zz][A-Za-z0-9]" maxlength="15" autocomplete="off" [(ngModel)]="details.gstin" /></label>
          </div>
          @if (selectedRestaurant(); as restaurant) {
            @if (!hasContactDetails(restaurant)) {
              <p class="err" role="alert">This restaurant needs an email and phone number before registration. <a [routerLink]="['/restaurants', restaurant.id]">Edit restaurant</a></p>
            }
          }
          <p class="muted">Bank and KYC details are sent securely to the backend and are never shown in the vendor list. Enter a valid IFSC and PAN.</p>
          @if (vendorForm.submitted && vendorForm.invalid) { <p class="err" role="alert">Complete the required fields and check the account number, IFSC, PAN, and optional GSTIN formats.</p> }
          <div class="actions">
            <button class="btn" type="submit" [disabled]="!canRegister()">{{ saving() ? 'Registering…' : 'Register vendor' }}</button>
            <button class="btn grey" type="button" (click)="clear(vendorForm)">Clear form</button>
          </div>
        </fieldset>
      </form>
    }
  `,
})
export class RestaurantVendorsComponent implements OnInit {
  private api = inject(RestaurantAdminService);
  private auth = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  readonly authorized = this.auth.isAuthenticated() && this.auth.isStaff() && !this.auth.isRestaurant();
  readonly vendors = signal<RestaurantVendor[]>([]);
  readonly restaurants = signal<AdminRestaurant[]>([]);
  readonly loading = signal(false);
  readonly restaurantsLoading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly listError = signal('');
  readonly restaurantsError = signal('');
  readonly message = signal('');
  readonly mask = maskVendorAccount;
  restaurantId: number | null = null;
  details = emptyDetails();

  constructor() { this.destroyRef.onDestroy(() => { this.details = emptyDetails(); }); }

  ngOnInit(): void {
    if (!this.authorized) return;
    this.loadVendors();
    this.loadRestaurants();
  }

  loadVendors(): void {
    if (!this.authorized || this.loading() || this.saving()) return;
    this.loading.set(true);
    this.listError.set('');
    this.api.vendors().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: rows => { this.vendors.set(rows); this.loading.set(false); },
      error: () => { this.listError.set('Unable to load vendors. Check your staff access and try refreshing.'); this.loading.set(false); },
    });
  }

  loadRestaurants(): void {
    if (!this.authorized || this.restaurantsLoading()) return;
    this.restaurantsLoading.set(true);
    this.restaurantsError.set('');
    this.api.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: rows => { this.restaurants.set(rows); this.restaurantsLoading.set(false); },
      error: () => { this.restaurantsError.set('Unable to load restaurants. Reload to register a vendor.'); this.restaurantsLoading.set(false); },
    });
  }

  selectedRestaurant(): AdminRestaurant | undefined {
    return this.restaurants().find(restaurant => restaurant.id === this.restaurantId);
  }

  hasContactDetails(restaurant: AdminRestaurant): boolean {
    return Boolean(restaurant.email?.trim() && restaurant.phone?.trim());
  }

  canRegister(): boolean {
    const restaurant = this.selectedRestaurant();
    return this.authorized && !this.saving() && !this.restaurantsLoading() && Boolean(restaurant && this.hasContactDetails(restaurant));
  }

  selectionChanged(): void {
    this.details = emptyDetails();
    this.error.set('');
    this.message.set('');
  }

  clear(form: NgForm): void {
    this.details = emptyDetails();
    this.restaurantId = null;
    form.resetForm({ restaurant_id: null, ...this.details });
    this.error.set('');
  }

  submit(form: NgForm): void {
    if (!this.canRegister() || form.invalid) return;
    const payload: VendorOnboardingPayload = {
      restaurant_id: this.restaurantId!,
      account_number: this.details.account_number.trim(),
      account_holder_name: this.details.account_holder_name.trim(),
      ifsc_code: this.details.ifsc_code.trim().toUpperCase(),
      pan: this.details.pan.trim().toUpperCase(),
      business_type: this.details.business_type.trim(),
      ...(this.details.gstin.trim() ? { gstin: this.details.gstin.trim().toUpperCase() } : {}),
    };
    if (!payload.account_holder_name || !payload.business_type || !/^[0-9]+$/.test(payload.account_number)
      || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(payload.ifsc_code) || !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(payload.pan)
      || (payload.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(payload.gstin))) {
      this.error.set('Check the required bank and business KYC fields.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    this.api.onboardVendor(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: vendor => {
        this.saving.set(false);
        this.clear(form);
        this.vendors.update(rows => [vendor, ...rows.filter(row => row.restaurant_id !== vendor.restaurant_id)]);
        this.message.set('Vendor registration submitted. Review the verification and settlement statuses in the list.');
        this.loadVendors();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        // Never render server response bodies: validation errors may echo bank/KYC values.
        const status = err instanceof HttpErrorResponse ? err.status : undefined;
        this.error.set(status === 502
          ? 'Cashfree registration failed. The backend retained the encrypted details for retry. Review the details and submit again when ready.'
          : status === 401 || status === 403
            ? 'Staff authorization is required. Sign in with an authorized staff account.'
            : status === 400
              ? 'Registration was rejected. Check the restaurant email and phone, bank details, and business KYC fields.'
              : 'Unable to confirm registration. Refresh vendor statuses before retrying.');
      },
    });
  }
}
