import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RestaurantAdminService } from './restaurant-admin.service';
import { RestaurantMenuAddonsComponent } from './restaurant-menu-addons.component';
import { RestaurantMenuBulkUploadComponent } from './restaurant-menu-bulk-upload.component';
import { MenuCategory, MenuItemPayload, PartnerMenuItem } from './restaurant.models';
import { ADMIN_CSS, errorText } from './restaurants-shared';

@Component({
  selector: 'app-restaurant-menu-items',
  imports: [ReactiveFormsModule, RestaurantMenuAddonsComponent, RestaurantMenuBulkUploadComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [ADMIN_CSS, `
    .item-form { display: grid; gap: 14px; }
    .check-row { display: flex; gap: 18px; flex-wrap: wrap; }
    .item-photo { max-width: 100px; max-height: 72px; object-fit: cover; border-radius: 6px; }
    .danger { color: #b71c1c; }
    .form-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  `],
  template: `
    <div class="bar" style="justify-content: space-between">
      <div>
        <h1>Menu items</h1>
        <p class="sub">Create and manage restaurant menu items.</p>
      </div>
      <div class="actions">
        <button class="btn" type="button" (click)="startCreate()">
          {{ formOpen() && !editingId() ? 'Close form' : 'Add menu item' }}
        </button>
        <app-restaurant-menu-bulk-upload resource="items" (uploaded)="loadItems()" />
      </div>
    </div>

    @if (success()) {
      <div class="ok" role="status">{{ success() }}</div>
    }
    @if (error()) {
      <div class="err" role="alert">{{ error() }}</div>
    }

    @if (formOpen()) {
      <form class="card item-form" [formGroup]="form" (ngSubmit)="save()">
        <h2>{{ editingId() ? 'Edit menu item' : 'Add menu item' }}</h2>
        @if (formError()) {
          <div class="err" role="alert">{{ formError() }}</div>
        }
        <div class="grid">
          <label class="f">Name *
            <input formControlName="name" required />
          </label>
          <label class="f">Category
            <select formControlName="category">
              <option value="">Uncategorized</option>
              @for (category of categories(); track category.id) {
                <option [value]="category.id">{{ category.name }}</option>
              }
            </select>
          </label>
          <label class="f">Price *
            <input type="number" min="0" step="0.01" formControlName="price" required />
          </label>
          <label class="f">MRP
            <input type="number" min="0" step="0.01" formControlName="mrp" />
          </label>
          <label class="f">Packaging charge
            <input type="number" min="0" step="0.01" formControlName="packaging_charge" />
          </label>
          <label class="f">Sort order
            <input type="number" min="0" step="1" formControlName="sort_order" />
          </label>
        </div>
        <label class="f">Description
          <textarea formControlName="description"></textarea>
        </label>
        <div class="check-row">
          <label class="chk">
            <input type="checkbox" formControlName="is_veg" /> Vegetarian
          </label>
          <label class="chk">
            <input type="checkbox" formControlName="is_available" /> Available
          </label>
        </div>
        <label class="f">Photo
          <input type="file" accept="image/*" (change)="onPhotoSelected($event)" />
        </label>
        @if (currentPhotoUrl()) {
          <p class="muted">Current image: <a [href]="currentPhotoUrl()" target="_blank" rel="noopener">View image</a></p>
        }
        <div class="form-actions">
          <button class="btn" type="submit" [disabled]="saving() || form.invalid">
            {{ saving() ? 'Saving...' : editingId() ? 'Save changes' : 'Create item' }}
          </button>
          <button class="btn grey" type="button" (click)="cancelForm()" [disabled]="saving()">Cancel</button>
        </div>
      </form>
      @if (editingId(); as itemId) {
        <app-restaurant-menu-addons [itemId]="itemId" />
      }
    }

    @if (loading()) {
      <p class="muted" role="status">Loading menu items...</p>
    } @else {
      <div class="wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col">Category</th>
              <th scope="col">Type</th>
              <th scope="col">Price</th>
              <th scope="col">Availability</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (item of items(); track item.id) {
              <tr>
                <td>
                  @if (item.image || item.photo) {
                    <img class="item-photo" [src]="item.image || item.photo || ''" [alt]="item.name" />
                  }
                  <strong>{{ item.name }}</strong>
                  @if (item.description) {
                    <div class="muted">{{ item.description }}</div>
                  }
                </td>
                <td>{{ item.category_name || categoryName(item.category) }}</td>
                <td>{{ item.is_veg ? 'Vegetarian' : 'Non-vegetarian' }}</td>
                <td>
                  ₹{{ item.price }}
                  @if (item.mrp) {
                    <div class="muted">MRP ₹{{ item.mrp }}</div>
                  }
                </td>
                <td>{{ item.is_available ? 'Available' : 'Unavailable' }}</td>
                <td>
                  @if (deleteConfirmationId() === item.id) {
                    <span class="danger">Delete this item?</span>
                    <button class="btn red sm" type="button" [disabled]="deletingId() === item.id" (click)="deleteItem(item)">
                      Confirm
                    </button>
                    <button class="btn grey sm" type="button" (click)="deleteConfirmationId.set(null)">Cancel</button>
                  } @else {
                    <div class="actions">
                      <button class="btn ghost sm" type="button" (click)="editItem(item)" [disabled]="saving()">Edit</button>
                      <button class="btn red sm" type="button" (click)="deleteConfirmationId.set(item.id)">Delete</button>
                    </div>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="muted">No menu items found.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class RestaurantMenuItemsComponent implements OnInit {
  private readonly api = inject(RestaurantAdminService);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    category: [''],
    is_veg: [true],
    price: ['', [Validators.required, Validators.min(0)]],
    mrp: ['0.00', Validators.min(0)],
    is_available: [true],
    packaging_charge: ['0.00', Validators.min(0)],
    sort_order: [0, [Validators.required, Validators.min(0)]],
  });
  readonly items = signal<PartnerMenuItem[]>([]);
  readonly categories = signal<MenuCategory[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deletingId = signal<number | null>(null);
  readonly deleteConfirmationId = signal<number | null>(null);
  readonly editingId = signal<number | null>(null);
  readonly formOpen = signal(false);
  readonly error = signal('');
  readonly formError = signal('');
  readonly success = signal('');
  readonly currentPhotoUrl = signal<string | null>(null);
  private selectedPhoto: File | null = null;

  ngOnInit(): void {
    this.loadItems();
    this.loadCategories();
  }

  startCreate(): void {
    if (this.formOpen() && !this.editingId()) {
      this.cancelForm();
      return;
    }
    this.cancelForm();
    this.formOpen.set(true);
  }

  editItem(item: PartnerMenuItem): void {
    this.saving.set(true);
    this.formError.set('');
    this.api.menuItem(item.id).subscribe({
      next: (detail) => {
        this.editingId.set(detail.id);
        this.form.patchValue({
          name: detail.name,
          description: detail.description ?? '',
          category: this.categoryId(detail.category)?.toString() ?? '',
          is_veg: detail.is_veg,
          price: detail.price,
          mrp: detail.mrp ?? '0.00',
          is_available: detail.is_available,
          packaging_charge: detail.packaging_charge ?? '0.00',
          sort_order: detail.sort_order,
        });
        this.currentPhotoUrl.set(detail.image ?? detail.photo ?? null);
        this.formOpen.set(true);
        this.saving.set(false);
      },
      error: (err: unknown) => {
        this.error.set(errorText(err));
        this.saving.set(false);
      },
    });
  }

  onPhotoSelected(event: Event): void {
    const target = event.target;
    this.selectedPhoto = target instanceof HTMLInputElement ? target.files?.[0] ?? null : null;
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.formError.set('');
    this.error.set('');
    this.success.set('');

    const raw = this.form.getRawValue();
    const payload: MenuItemPayload = {
      name: raw.name.trim(),
      description: raw.description.trim(),
      category: raw.category ? Number(raw.category) : null,
      is_veg: raw.is_veg,
      price: raw.price,
      mrp: raw.mrp || '0.00',
      is_available: raw.is_available,
      packaging_charge: raw.packaging_charge || '0.00',
      sort_order: raw.sort_order,
    };
    const id = this.editingId();
    const requestData = this.selectedPhoto ? this.toFormData(payload, this.selectedPhoto) : payload;
    const request = id
      ? this.api.updateMenuItem(id, requestData)
      : this.api.createMenuItem(requestData);

    request.subscribe({
      next: (saved) => {
        this.success.set(id ? 'Menu item updated.' : 'Menu item created.');
        this.cancelForm();
        this.items.update((items) => {
          const withoutSaved = items.filter((item) => item.id !== saved.id);
          return [...withoutSaved, saved].sort((a, b) => a.sort_order - b.sort_order);
        });
        this.saving.set(false);
      },
      error: (err: unknown) => {
        this.formError.set(this.apiErrorText(err));
        this.saving.set(false);
      },
    });
  }

  deleteItem(item: PartnerMenuItem): void {
    if (this.deletingId()) return;
    this.deletingId.set(item.id);
    this.error.set('');
    this.success.set('');
    this.api.deleteMenuItem(item.id).subscribe({
      next: () => {
        this.items.update((items) => items.filter((current) => current.id !== item.id));
        this.deleteConfirmationId.set(null);
        this.deletingId.set(null);
        this.success.set(`Deleted ${item.name}.`);
      },
      error: (err: unknown) => {
        this.error.set(errorText(err));
        this.deletingId.set(null);
        this.deleteConfirmationId.set(null);
      },
    });
  }

  cancelForm(): void {
    this.formOpen.set(false);
    this.editingId.set(null);
    this.currentPhotoUrl.set(null);
    this.selectedPhoto = null;
    this.form.reset({
      name: '',
      description: '',
      category: '',
      is_veg: true,
      price: '',
      mrp: '0.00',
      is_available: true,
      packaging_charge: '0.00',
      sort_order: 0,
    });
    this.formError.set('');
  }

  categoryName(category: PartnerMenuItem['category']): string {
    if (!category) return 'Uncategorized';
    if (typeof category === 'number') {
      return this.categories().find((entry) => entry.id === category)?.name ?? '—';
    }
    return category.name;
  }

  private categoryId(category: PartnerMenuItem['category']): number | null {
    if (!category) return null;
    return typeof category === 'number' ? category : category.id;
  }

  protected loadItems(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.menuItems().subscribe({
      next: (response) => {
        const rows = Array.isArray(response) ? response : response.results;
        this.items.set(rows.sort((a, b) => a.sort_order - b.sort_order));
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(errorText(err));
        this.loading.set(false);
      },
    });
  }

  private loadCategories(): void {
    this.api.partnerCategories().subscribe({
      next: (response) => this.categories.set(Array.isArray(response) ? response : response.results),
      error: (err: unknown) => this.error.set(errorText(err)),
    });
  }

  private toFormData(payload: MenuItemPayload, image: File): FormData {
    const data = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      data.append(key, key === 'category' && value === null ? '' : String(value));
    });
    data.append('image', image);
    return data;
  }

  private apiErrorText(err: unknown): string {
    if (err instanceof HttpErrorResponse && err.error && typeof err.error === 'object') {
      const details = Object.entries(err.error as Record<string, unknown>)
        .map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(' ') : String(value)}`)
        .join(' | ');
      if (details) return details;
    }
    return errorText(err);
  }
}
