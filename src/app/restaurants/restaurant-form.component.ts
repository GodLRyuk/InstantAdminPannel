import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RestaurantAdminService } from './restaurant-admin.service';
import { AuthService } from '../services/auth.service';
import { AdminRestaurant, Cuisine } from './restaurant.models';
import { ADMIN_CSS, errorText } from './restaurants-shared';
import { AdminUser } from '../models/user.model';
import { MasterService } from '../services/auth.service';

@Component({
  selector: 'app-restaurant-form',
  imports: [ReactiveFormsModule, RouterLink],
  styles: [ADMIN_CSS],
  template: `
    <div class="bar" style="justify-content: space-between">
      <div>
        <h1>{{ isRestaurantOwner ? 'Your restaurant details' : id ? 'Edit restaurant' : 'Add restaurant' }}</h1>
        <p class="sub">
          {{ isRestaurantOwner ? 'Update your restaurant profile and operating details.' : id ? 'Owner: ' + ownerName() : 'Creates the restaurant for an existing user account.' }}
        </p>
      </div>
      <a class="btn ghost" routerLink="/restaurants">Back to list</a>
    </div>

    @if (profileLoading()) {
      <p class="muted" role="status">Loading restaurant details...</p>
    } @else {
    @if (error()) {
      <div class="err">{{ error() }}</div>
    }
    @if (saved()) {
      <div class="ok">Saved.</div>
    }

    <form [formGroup]="form" (ngSubmit)="save()">
      <div class="card">
        <h2>Basic details</h2>
        <div class="grid">
          @if (!isRestaurantOwner) {
            <label class="f">Restaurant owner *
              <select formControlName="owner">
                <option [ngValue]="null">Select a restaurant owner</option>
                @for (user of restaurantOwners(); track user.id) {
                  <option [ngValue]="user.id">{{ ownerLabel(user) }}</option>
                }
              </select>
              @if (loadingOwners()) {
                <span class="muted">Loading restaurant owners...</span>
              } @else if (ownerLoadError()) {
                <span class="err">{{ ownerLoadError() }}</span>
              } @else if (!restaurantOwners().length) {
                <span class="muted">No restaurant users found. Create a user with the Restaurants role first.</span>
              }
            </label>
          }
          <label class="f">Restaurant name *
            <input formControlName="name" />
          </label>
          <label class="f">Phone *
            <input formControlName="phone" />
          </label>
          <label class="f">Email
            <input type="email" formControlName="email" />
          </label>
          <label class="f">FSSAI number
            <input formControlName="fssai_number" />
          </label>
        </div>
        <label class="f" style="margin-top: 12px">Description
          <textarea formControlName="description"></textarea>
        </label>
        @if (!isRestaurantOwner) {
          <h2 style="margin-top: 16px">Cuisines</h2>
          <div class="chips">
            @for (c of cuisines(); track c.id) {
              <label class="chk">
                <input type="checkbox" [checked]="hasCuisine(c.id)" (change)="toggleCuisine(c.id, $any($event.target).checked)" />
                {{ c.name }}
              </label>
            } @empty {
              <span class="muted">No cuisines yet. Add them in Django admin first.</span>
            }
          </div>
        }
      </div>

      <div class="card">
        <h2>Address and location</h2>
        <div class="grid">
          <label class="f">Address *
            <input formControlName="address_line" />
          </label>
          <label class="f">City *
            <input formControlName="city" />
          </label>
          <label class="f">Pincode
            <input formControlName="pincode" />
          </label>
          <label class="f">Latitude
            <input type="number" step="any" formControlName="latitude" />
          </label>
          <label class="f">Longitude
            <input type="number" step="any" formControlName="longitude" />
          </label>
        </div>
        <p class="muted">Latitude and longitude are needed for distance, ETA and the delivery radius.</p>
      </div>

      <div class="card">
        <h2>Timing and delivery</h2>
        <div class="grid">
          <label class="f">Opens at
            <input type="time" formControlName="opens_at" />
          </label>
          <label class="f">Closes at
            <input type="time" formControlName="closes_at" />
          </label>
          <label class="f">Preparation time (minutes)
            <input type="number" formControlName="avg_prep_minutes" />
          </label>
          <label class="f">Delivery fee (₹)
            <input type="number" step="0.01" formControlName="delivery_fee" />
          </label>
          <label class="f">Delivery radius (km)
            <input type="number" step="0.1" formControlName="delivery_radius_km" />
          </label>
          <label class="f">Minimum order (₹)
            <input type="number" step="0.01" formControlName="min_order_amount" />
          </label>
        </div>
        <label class="chk" style="margin-top: 12px">
          <input type="checkbox" formControlName="is_accepting_orders" /> Accepting orders
        </label>
      </div>

      <div class="card">
        <h2>Offer</h2>
        <div class="grid">
          <label class="f">Discount %
            <input type="number" formControlName="offer_percent" placeholder="e.g. 30" />
          </label>
          <label class="f">Maximum discount (₹, 0 = no limit)
            <input type="number" formControlName="offer_max_discount" />
          </label>
          <label class="f">Minimum order for offer (₹)
            <input type="number" step="0.01" formControlName="offer_min_order" />
          </label>
          <label class="f">Offer code
            <input formControlName="offer_code" placeholder="SPICE30" />
          </label>
        </div>
      </div>

      <div class="card">
        <h2>Photos</h2>
        <div class="grid">
          <label class="f">Logo
            <input type="file" accept="image/*" (change)="pick($event, 'logo')" />
          </label>
          <label class="f">Cover image
            <input type="file" accept="image/*" (change)="pick($event, 'cover_image')" />
          </label>
        </div>
        @if (current()?.logo || current()?.cover_image) {
          <div class="imgs">
            @if (current()?.logo) { <img [src]="current()!.logo" alt="Logo" /> }
            @if (current()?.cover_image) { <img [src]="current()!.cover_image" alt="Cover" /> }
          </div>
        }
      </div>

      @if (!isRestaurantOwner) {
        <div class="card">
          <h2>Approval and rating</h2>
          <div class="grid">
            <label class="f">Status
              <select formControlName="status">
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
              </select>
            </label>
            <label class="f">Reason (for rejected / suspended)
              <input formControlName="rejection_reason" />
            </label>
            <label class="f">Rating (0 - 5)
              <input type="number" step="0.1" formControlName="rating" />
            </label>
            <label class="f">Number of ratings
              <input type="number" formControlName="rating_count" />
            </label>
          </div>
        </div>
      }

      <div class="actions">
        <button type="submit" class="btn" [disabled]="saving()">{{ saving() ? 'Saving...' : isRestaurantOwner ? 'Save changes' : 'Save' }}</button>
        <a class="btn grey" routerLink="/restaurants">Cancel</a>
      </div>
    </form>
    }
  `,
})
export class RestaurantFormComponent implements OnInit {
  private api = inject(RestaurantAdminService);
  private usersApi = inject(MasterService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  readonly isRestaurantOwner = inject(AuthService).isRestaurant();

  id: number | null = null;
  cuisines = signal<Cuisine[]>([]);
  restaurantOwners = signal<AdminUser[]>([]);
  loadingOwners = signal(false);
  ownerLoadError = signal('');
  current = signal<AdminRestaurant | null>(null);
  ownerName = signal('');
  saving = signal(false);
  saved = signal(false);
  error = signal('');
  profileLoading = signal(false);
  private selectedCuisines: number[] = [];
  private files: { logo: File | null; cover_image: File | null } = { logo: null, cover_image: null };

  form = this.fb.group({
    owner: [null as number | null],
    name: [''],
    description: [''],
    phone: [''],
    email: [''],
    address_line: [''],
    city: [''],
    pincode: [''],
    latitude: [null as number | null],
    longitude: [null as number | null],
    fssai_number: [''],
    opens_at: ['10:00'],
    closes_at: ['22:00'],
    is_accepting_orders: [true],
    avg_prep_minutes: [30],
    delivery_fee: [25],
    delivery_radius_km: [8],
    min_order_amount: [0],
    offer_percent: [null as number | null],
    offer_max_discount: [0],
    offer_min_order: [0],
    offer_code: [''],
    rating: [0],
    rating_count: [0],
    status: ['approved'],
    rejection_reason: [''],
  });

  ngOnInit() {
    const param = this.route.snapshot.paramMap.get('id');
    if (this.isRestaurantOwner) {
      if (!param) {
        this.router.navigate(['/restaurants']);
        return;
      }
      this.id = Number(param);
      if (!Number.isInteger(this.id) || this.id <= 0) {
        this.error.set('Invalid restaurant ID.');
        return;
      }
      this.profileLoading.set(true);
      this.api.getOwnerRestaurant(this.id).subscribe({
        next: (restaurant) => {
          this.fill(restaurant);
          this.profileLoading.set(false);
        },
        error: (e) => {
          this.error.set(errorText(e));
          this.profileLoading.set(false);
        },
      });
      return;
    }
    this.loadRestaurantOwners();
    this.api.cuisines().subscribe((c) => this.cuisines.set(c));
    if (param) {
      this.id = Number(param);
      this.api.get(this.id).subscribe({
        next: (r) => this.fill(r),
        error: (e) => this.error.set(errorText(e)),
      });
    }
  }

  private loadRestaurantOwners() {
    this.loadingOwners.set(true);
    this.ownerLoadError.set('');
    this.usersApi.getUsers('RESTAURANT').subscribe({
      next: (response) => {
        this.restaurantOwners.set(Array.isArray(response) ? response : response.results);
        this.loadingOwners.set(false);
      },
      error: () => {
        this.ownerLoadError.set('Unable to load restaurant users.');
        this.loadingOwners.set(false);
      },
    });
  }

  ownerLabel(user: AdminUser): string {
    const name = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
    return `${name || user.username} — ${user.email || user.username} (ID: ${user.id})`;
  }

  private fill(r: AdminRestaurant) {
    this.current.set(r);
    this.ownerName.set(r.owner_name);
    this.selectedCuisines = [...(r.cuisines ?? [])];
    this.form.patchValue({
      owner: r.owner,
      name: r.name,
      description: r.description,
      phone: r.phone,
      email: r.email,
      address_line: r.address_line,
      city: r.city,
      pincode: r.pincode,
      latitude: r.latitude === null ? null : Number(r.latitude),
      longitude: r.longitude === null ? null : Number(r.longitude),
      fssai_number: r.fssai_number,
      opens_at: r.opens_at.slice(0, 5),
      closes_at: r.closes_at.slice(0, 5),
      is_accepting_orders: r.is_accepting_orders,
      avg_prep_minutes: r.avg_prep_minutes,
      delivery_fee: Number(r.delivery_fee),
      delivery_radius_km: Number(r.delivery_radius_km),
      min_order_amount: Number(r.min_order_amount),
      offer_percent: r.offer_percent,
      offer_max_discount: r.offer_max_discount,
      offer_min_order: Number(r.offer_min_order),
      offer_code: r.offer_code,
      rating: Number(r.rating),
      rating_count: r.rating_count,
      status: r.status,
      rejection_reason: r.rejection_reason,
    });
  }

  hasCuisine(id: number) {
    return this.selectedCuisines.includes(id);
  }

  toggleCuisine(id: number, on: boolean) {
    this.selectedCuisines = on
      ? [...new Set([...this.selectedCuisines, id])]
      : this.selectedCuisines.filter((x) => x !== id);
  }

  pick(event: Event, key: 'logo' | 'cover_image') {
    this.files[key] = (event.target as HTMLInputElement).files?.[0] ?? null;
  }

  save() {
    this.error.set('');
    this.saved.set(false);
    const v = this.form.getRawValue();
    const body: Record<string, unknown> = {
      ...v,
      latitude: v.latitude === null || (v.latitude as unknown) === '' ? null : v.latitude,
      longitude: v.longitude === null || (v.longitude as unknown) === '' ? null : v.longitude,
      offer_percent: v.offer_percent === null || (v.offer_percent as unknown) === '' ? null : v.offer_percent,
    };
    if (!this.isRestaurantOwner) {
      body['cuisines'] = this.selectedCuisines;
    }
    if (this.isRestaurantOwner) {
      delete body['owner'];
      delete body['cuisines'];
      delete body['status'];
      delete body['rejection_reason'];
      delete body['rating'];
      delete body['rating_count'];
    } else if (!this.id && !v.owner) {
      this.error.set('Enter the owner user ID.');
      return;
    }

    this.saving.set(true);
    const call = this.isRestaurantOwner && this.id
      ? this.api.updateOwnerRestaurant(this.id, body)
      : this.id ? this.api.update(this.id, body) : this.api.create(body);
    call.subscribe({
      next: (r) => this.afterSave(r),
      error: (e) => {
        this.saving.set(false);
        this.error.set(errorText(e));
      },
    });
  }

  private afterSave(r: AdminRestaurant) {
    const { logo, cover_image } = this.files;
    if (!logo && !cover_image) {
      this.finish(r);
      return;
    }
    const upload = this.isRestaurantOwner
      ? this.api.updateOwnerRestaurant(r.id, this.imageFormData({ logo, cover_image }))
      : this.api.uploadImages(r.id, { logo, cover_image });
    upload.subscribe({
      next: (withImages) => {
        this.files = { logo: null, cover_image: null };
        this.finish(withImages);
      },
      error: (e) => {
        this.saving.set(false);
        this.error.set('Details saved, but the photos failed: ' + errorText(e));
        if (!this.id) this.router.navigate(['/restaurants', r.id]);
      },
    });
  }

  private finish(r: AdminRestaurant) {
    this.saving.set(false);
    if (this.isRestaurantOwner) {
      this.fill(r);
      this.saved.set(true);
      return;
    }
    if (!this.id) {
      this.router.navigate(['/restaurants']);
      return;
    }
    this.fill(r);
    this.saved.set(true);
  }

  private imageFormData(files: { logo: File | null; cover_image: File | null }): FormData {
    const data = new FormData();
    if (files.logo) data.append('logo', files.logo);
    if (files.cover_image) data.append('cover_image', files.cover_image);
    return data;
  }
}
