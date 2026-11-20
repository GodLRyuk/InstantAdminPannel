import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RestaurantAdminService } from './restaurant-admin.service';
import { RestaurantMenuBulkUploadComponent } from './restaurant-menu-bulk-upload.component';
import { AuthService } from '../services/auth.service';
import { AdminRestaurant, Cuisine, MenuCategory } from './restaurant.models';
import { ADMIN_CSS, errorText } from './restaurants-shared';

@Component({
  selector: 'app-restaurant-menu',
  imports: [ReactiveFormsModule, RestaurantMenuBulkUploadComponent],
  styles: [ADMIN_CSS],
  template: `
    <div class="bar" style="justify-content: space-between">
      <div>
        <h1>{{ isRestaurantOwner ? 'Menu categories' : 'Cuisines and menu categories' }}</h1>
        <p class="sub">
          {{ isRestaurantOwner ? 'View the categories for your restaurant menu.' : 'Create cuisine options and restaurant-specific menu categories.' }}
        </p>
      </div>
      @if (isRestaurantOwner) {
        <app-restaurant-menu-bulk-upload resource="categories" (uploaded)="loadPartnerCategories()" />
      }
    </div>

    @if (!isRestaurantOwner) {
      <div class="card">
        <h2>Cuisines</h2>
        @if (cuisineError()) {
          <div class="err" role="alert">{{ cuisineError() }}</div>
        }
        @if (cuisineSuccess()) {
          <div class="ok" role="status">{{ cuisineSuccess() }}</div>
        }
        <form class="bar" [formGroup]="cuisineForm" (ngSubmit)="addCuisine()">
          <label class="f">Cuisine name *
            <input formControlName="name" placeholder="e.g. South Indian" />
          </label>
          <button class="btn" type="submit" [disabled]="savingCuisine() || cuisineForm.invalid">
            {{ savingCuisine() ? 'Adding...' : 'Add cuisine' }}
          </button>
        </form>
        @if (loadingCuisines()) {
          <p class="muted" role="status">Loading cuisines...</p>
        } @else {
          <div class="chips">
            @for (cuisine of cuisines(); track cuisine.id) {
              <span class="badge">{{ cuisine.name }}</span>
            } @empty {
              <span class="muted">No cuisines yet.</span>
            }
        </div>
      }
      </div>
    }

    <div class="card">
      <h2>Menu categories</h2>
      @if (categoryError()) {
        <div class="err" role="alert">{{ categoryError() }}</div>
      }
      @if (categorySuccess()) {
        <div class="ok" role="status">{{ categorySuccess() }}</div>
      }
      @if (!isRestaurantOwner && restaurantError()) {
        <div class="err" role="alert">{{ restaurantError() }}</div>
      }
      @if (!isRestaurantOwner && loadingRestaurants()) {
        <p class="muted" role="status">Loading restaurants...</p>
      } @else if (!isRestaurantOwner && restaurants().length === 0) {
        <p class="muted">Add a restaurant before creating menu categories.</p>
      } @else {
        @if (!isRestaurantOwner) {
          <form class="bar" [formGroup]="categoryForm" (ngSubmit)="addCategory()">
            <label class="f">Restaurant *
              <select formControlName="restaurant" (change)="onRestaurantChange()">
                @for (restaurant of restaurants(); track restaurant.id) {
                  <option [ngValue]="restaurant.id">{{ restaurant.name }}</option>
                }
              </select>
            </label>
            <label class="f">Category name *
              <input formControlName="name" placeholder="e.g. Beverages" />
            </label>
            <label class="f">Sort order
              <input type="number" min="0" formControlName="sort_order" />
            </label>
            <button class="btn" type="submit" [disabled]="savingCategory() || categoryForm.invalid">
              {{ savingCategory() ? 'Adding...' : 'Add category' }}
            </button>
          </form>
        } @else {
          <form class="bar" [formGroup]="partnerCategoryForm" (ngSubmit)="savePartnerCategory()">
            <label class="f">Category name *
              <input formControlName="name" placeholder="e.g. Beverages" />
            </label>
            <label class="f">Sort order
              <input type="number" min="0" formControlName="sort_order" />
            </label>
            <button class="btn" type="submit" [disabled]="savingCategory() || partnerCategoryForm.invalid">
              {{ savingCategory() ? 'Saving...' : editingCategoryId() ? 'Save category' : 'Add category' }}
            </button>
            @if (editingCategoryId()) {
              <button class="btn grey" type="button" (click)="cancelPartnerCategoryEdit()">Cancel</button>
            }
          </form>
        }

        @if (loadingCategories()) {
          <p class="muted" role="status">Loading categories...</p>
        } @else {
          <div class="wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  @if (isRestaurantOwner) {
                    <th scope="col">Actions</th>
                  } @else {
                    <th scope="col">Restaurant</th>
                  }
                  <th scope="col">Sort order</th>
                </tr>
              </thead>
              <tbody>
                @for (category of categories(); track category.id) {
                  <tr>
                    <td>{{ category.name }}</td>
                    @if (isRestaurantOwner) {
                      <td>
                        @if (deleteCategoryConfirmationId() === category.id) {
                          <span class="muted">Delete category?</span>
                          <button class="btn red sm" type="button" [disabled]="deletingCategoryId() === category.id" (click)="deletePartnerCategory(category)">
                            Confirm
                          </button>
                          <button class="btn grey sm" type="button" (click)="deleteCategoryConfirmationId.set(null)">Cancel</button>
                        } @else {
                          <div class="actions">
                            <button class="btn ghost sm" type="button" (click)="editPartnerCategory(category)" [disabled]="savingCategory()">Edit</button>
                            <button class="btn red sm" type="button" (click)="deleteCategoryConfirmationId.set(category.id)">Delete</button>
                          </div>
                        }
                      </td>
                    } @else {
                      <td>{{ category.restaurant_name }}</td>
                    }
                    <td>{{ category.sort_order }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="3" class="muted">No categories for this restaurant yet.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    </div>
  `,
})
export class RestaurantMenuComponent implements OnInit {
  private readonly api = inject(RestaurantAdminService);
  private readonly fb = inject(FormBuilder);
  readonly isRestaurantOwner = inject(AuthService).isRestaurant();

  readonly cuisineForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
  });
  readonly categoryForm = this.fb.nonNullable.group({
    restaurant: [0, Validators.min(1)],
    name: ['', Validators.required],
    sort_order: [0, [Validators.required, Validators.min(0)]],
  });
  readonly partnerCategoryForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    sort_order: [0, [Validators.required, Validators.min(0)]],
  });

  readonly cuisines = signal<Cuisine[]>([]);
  readonly restaurants = signal<AdminRestaurant[]>([]);
  readonly categories = signal<MenuCategory[]>([]);
  readonly loadingCuisines = signal(false);
  readonly loadingRestaurants = signal(false);
  readonly loadingCategories = signal(false);
  readonly savingCuisine = signal(false);
  readonly savingCategory = signal(false);
  readonly cuisineError = signal('');
  readonly restaurantError = signal('');
  readonly categoryError = signal('');
  readonly cuisineSuccess = signal('');
  readonly categorySuccess = signal('');
  readonly editingCategoryId = signal<number | null>(null);
  readonly deletingCategoryId = signal<number | null>(null);
  readonly deleteCategoryConfirmationId = signal<number | null>(null);

  ngOnInit(): void {
    if (this.isRestaurantOwner) {
      this.loadPartnerCategories();
    } else {
      this.loadCuisines();
      this.loadRestaurants();
    }
  }

  addCuisine(): void {
    if (this.cuisineForm.invalid || this.savingCuisine()) return;

    this.savingCuisine.set(true);
    this.cuisineError.set('');
    this.cuisineSuccess.set('');
    const name = this.cuisineForm.controls.name.value.trim();
    this.api.createCuisine(name).subscribe({
      next: (cuisine) => {
        this.cuisines.update((current) => [...current, cuisine]);
        this.cuisineForm.reset({ name: '' });
        this.cuisineSuccess.set(`Added ${cuisine.name}.`);
        this.savingCuisine.set(false);
      },
      error: (err: unknown) => {
        this.cuisineError.set(errorText(err));
        this.savingCuisine.set(false);
      },
    });
  }

  onRestaurantChange(): void {
    this.loadCategories();
  }

  addCategory(): void {
    if (this.categoryForm.invalid || this.savingCategory()) return;

    this.savingCategory.set(true);
    this.categoryError.set('');
    this.categorySuccess.set('');
    const data = this.categoryForm.getRawValue();
    this.api.createMenuCategory({
      restaurant: data.restaurant,
      name: data.name.trim(),
      sort_order: data.sort_order,
    }).subscribe({
      next: (category) => {
        this.categories.update((current) => [...current, category].sort((a, b) => a.sort_order - b.sort_order));
        this.categoryForm.patchValue({ name: '' });
        this.categorySuccess.set(`Added ${category.name} to ${category.restaurant_name}.`);
        this.savingCategory.set(false);
      },
      error: (err: unknown) => {
        this.categoryError.set(errorText(err));
        this.savingCategory.set(false);
      },
    });
  }

  editPartnerCategory(category: MenuCategory): void {
    this.editingCategoryId.set(category.id);
    this.partnerCategoryForm.setValue({
      name: category.name,
      sort_order: category.sort_order,
    });
    this.categoryError.set('');
    this.categorySuccess.set('');
  }

  cancelPartnerCategoryEdit(): void {
    this.editingCategoryId.set(null);
    this.partnerCategoryForm.reset({ name: '', sort_order: 0 });
  }

  savePartnerCategory(): void {
    if (this.partnerCategoryForm.invalid || this.savingCategory()) return;
    this.savingCategory.set(true);
    this.categoryError.set('');
    this.categorySuccess.set('');
    const value = this.partnerCategoryForm.getRawValue();
    const payload = { name: value.name.trim(), sort_order: value.sort_order };
    const id = this.editingCategoryId();
    const request = id
      ? this.api.updatePartnerCategory(id, payload)
      : this.api.createPartnerCategory(payload);
    request.subscribe({
      next: (saved) => {
        this.categories.update((current) => current
          .filter((category) => category.id !== saved.id)
          .concat(saved)
          .sort((a, b) => a.sort_order - b.sort_order));
        this.cancelPartnerCategoryEdit();
        this.categorySuccess.set(id ? 'Category updated.' : 'Category added.');
        this.savingCategory.set(false);
      },
      error: (err: unknown) => {
        this.categoryError.set(errorText(err));
        this.savingCategory.set(false);
      },
    });
  }

  deletePartnerCategory(category: MenuCategory): void {
    if (this.deletingCategoryId()) return;
    this.deletingCategoryId.set(category.id);
    this.categoryError.set('');
    this.categorySuccess.set('');
    this.api.deletePartnerCategory(category.id).subscribe({
      next: () => {
        this.categories.update((current) => current.filter((item) => item.id !== category.id));
        this.deleteCategoryConfirmationId.set(null);
        this.deletingCategoryId.set(null);
        this.categorySuccess.set(`Deleted ${category.name}.`);
      },
      error: (err: unknown) => {
        this.categoryError.set(errorText(err));
        this.deleteCategoryConfirmationId.set(null);
        this.deletingCategoryId.set(null);
      },
    });
  }

  private loadCuisines(): void {
    this.loadingCuisines.set(true);
    this.cuisineError.set('');
    this.api.cuisines().subscribe({
      next: (rows) => {
        this.cuisines.set(rows);
        this.loadingCuisines.set(false);
      },
      error: (err: unknown) => {
        this.cuisineError.set(errorText(err));
        this.loadingCuisines.set(false);
      },
    });
  }

  private loadRestaurants(): void {
    this.loadingRestaurants.set(true);
    this.restaurantError.set('');
    this.api.list({}).subscribe({
      next: (rows) => {
        this.restaurants.set(rows);
        this.loadingRestaurants.set(false);
        if (rows.length) {
          this.categoryForm.patchValue({ restaurant: rows[0].id });
          this.loadCategories();
        }
      },
      error: (err: unknown) => {
        this.restaurantError.set(errorText(err));
        this.loadingRestaurants.set(false);
      },
    });
  }

  private loadCategories(): void {
    const restaurantId = this.categoryForm.controls.restaurant.value;
    if (!restaurantId) {
      this.categories.set([]);
      return;
    }
    this.loadingCategories.set(true);
    this.categoryError.set('');
    this.api.menuCategories(restaurantId).subscribe({
      next: (rows) => {
        this.categories.set(rows);
        this.loadingCategories.set(false);
      },
      error: (err: unknown) => {
        this.categoryError.set(errorText(err));
        this.loadingCategories.set(false);
      },
    });
  }

  protected loadPartnerCategories(): void {
    this.loadingCategories.set(true);
    this.categoryError.set('');
    this.api.partnerCategories().subscribe({
      next: (response) => {
        const rows = Array.isArray(response) ? response : response.results;
        this.categories.set(rows.sort((a, b) => a.sort_order - b.sort_order));
        this.loadingCategories.set(false);
      },
      error: (err: unknown) => {
        this.categoryError.set(errorText(err));
        this.loadingCategories.set(false);
      },
    });
  }
}
