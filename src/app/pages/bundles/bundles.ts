import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Bundle, BundlePayload } from '../../models/bundle.model';
import { ProductModel } from '../../models/products.model';
import { getPromotionApiError } from '../../models/promotion.model';
import { MasterService } from '../../services/auth.service';

@Component({
  selector: 'app-bundles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bundles.html',
  styleUrl: './bundles.css',
})
export class Bundles implements OnInit {
  @ViewChild('bundleImageInput') private bundleImageInput?: ElementRef<HTMLInputElement>;
  bundles: Bundle[] = [];
  products: ProductModel[] = [];
  filteredProducts: ProductModel[] = [];
  productSearch = '';
  form = this.emptyForm();
  editingId: number | null = null;
  currentImage: string | null = null;
  loading = false;
  saving = false;
  deletingId: number | null = null;
  errorMessage = '';
  successMessage = '';

  constructor(private masterService: MasterService) {}

  ngOnInit(): void {
    this.loadBundles();
    this.loadProducts();
  }

  loadBundles(): void {
    this.loading = true;
    this.errorMessage = '';
    this.masterService.getBundles().subscribe({
      next: (response) => {
        this.bundles = Array.isArray(response) ? response : response.results;
        this.loading = false;
      },
      error: (error: unknown) => {
        this.errorMessage = getPromotionApiError(error, 'Unable to load bundles.');
        console.error('Loading bundles failed.', error);
        this.loading = false;
      },
    });
  }

  loadProducts(): void {
    this.masterService.getAllProducts().subscribe({
      next: (response: ProductModel[] | { results: ProductModel[] }) => {
        this.products = Array.isArray(response) ? response : response.results;
        this.applyProductSearch();
      },
      error: (error: unknown) => {
        this.errorMessage = getPromotionApiError(error, 'Unable to load products.');
        console.error('Loading products for bundles failed.', error);
      },
    });
  }

  onProductSearch(value: string): void {
    this.productSearch = value;
    this.applyProductSearch();
  }

  isProductSelected(productId: number): boolean {
    return this.form.products.includes(productId);
  }

  onProductChange(event: Event, productId: number): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.form.products = target.checked
      ? [...this.form.products, productId]
      : this.form.products.filter((id) => id !== productId);
  }

  onImageChange(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.form.image = target.files?.[0] ?? null;
  }

  openCreateForm(): void {
    this.editingId = null;
    this.currentImage = null;
    this.form = this.emptyForm();
    this.resetImageInput();
    this.productSearch = '';
    this.applyProductSearch();
    this.errorMessage = '';
    this.successMessage = '';
  }

  editBundle(bundle: Bundle): void {
    this.editingId = bundle.id;
    this.currentImage = bundle.image;
    this.resetImageInput();
    this.errorMessage = '';
    this.successMessage = '';
    this.form = {
      name: bundle.name,
      description: bundle.description,
      image: null,
      products: bundle.products.map((product) => typeof product === 'number' ? product : product.id),
      bundle_price: Number(bundle.bundle_price),
      is_active: bundle.is_active,
    };
  }

  cancelEdit(): void {
    this.openCreateForm();
  }

  saveBundle(): void {
    const payload = this.toPayload();
    if (!payload || this.saving) {
      if (!payload) {
        this.errorMessage = 'Enter a name, select at least one product, and provide a valid non-negative bundle price.';
      }
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';
    const editingId = this.editingId;
    const request = editingId === null
      ? this.masterService.createBundle(payload)
      : this.masterService.updateBundle(editingId, payload);

    request.subscribe({
      next: () => {
        this.editingId = null;
        this.currentImage = null;
        this.form = this.emptyForm();
        this.resetImageInput();
        this.successMessage = editingId === null ? 'Bundle created.' : 'Bundle updated.';
        this.saving = false;
        this.loadBundles();
      },
      error: (error: unknown) => {
        this.errorMessage = getPromotionApiError(error, 'Unable to save this bundle.');
        console.error('Saving bundle failed.', error);
        this.saving = false;
      },
    });
  }

  deleteBundle(bundle: Bundle): void {
    if (this.deletingId !== null || !confirm(`Delete the bundle "${bundle.name}"? This cannot be undone.`)) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.deletingId = bundle.id;
    this.masterService.deleteBundle(bundle.id).subscribe({
      next: () => {
        if (this.editingId === bundle.id) {
          this.editingId = null;
          this.currentImage = null;
          this.form = this.emptyForm();
        }
        this.deletingId = null;
        this.successMessage = `Bundle "${bundle.name}" deleted.`;
        this.loadBundles();
      },
      error: (error: unknown) => {
        this.errorMessage = getPromotionApiError(error, 'Unable to delete this bundle.');
        console.error('Deleting bundle failed.', error);
        this.deletingId = null;
      },
    });
  }

  bundleProductNames(bundle: Bundle): string {
    return bundle.products
      .map((item) => {
        if (typeof item !== 'number') {
          return item.name;
        }
        return this.products.find((product) => product.id === item)?.name ?? `#${item}`;
      })
      .join(', ');
  }

  private applyProductSearch(): void {
    const query = this.productSearch.trim().toLocaleLowerCase();
    this.filteredProducts = query
      ? this.products.filter((product) =>
        product.name.toLocaleLowerCase().includes(query) || String(product.id).includes(query)
      )
      : this.products;
  }

  private resetImageInput(): void {
    if (this.bundleImageInput) {
      this.bundleImageInput.nativeElement.value = '';
    }
  }

  private toPayload(): BundlePayload | null {
    const bundlePrice = Number(this.form.bundle_price);
    if (
      !this.form.name.trim()
      || this.form.products.length === 0
      || !Number.isFinite(bundlePrice)
      || bundlePrice < 0
    ) {
      return null;
    }

    return {
      name: this.form.name.trim(),
      description: this.form.description.trim(),
      image: this.form.image,
      products: [...this.form.products],
      bundle_price: bundlePrice,
      is_active: this.form.is_active,
    };
  }

  private emptyForm(): {
    name: string;
    description: string;
    image: File | null;
    products: number[];
    bundle_price: number;
    is_active: boolean;
  } {
    return {
      name: '',
      description: '',
      image: null,
      products: [],
      bundle_price: 0,
      is_active: true,
    };
  }
}
