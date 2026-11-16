import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductModel } from '../../models/products.model';
import {
  FlashSale,
  FlashSalePayload,
  FlashSaleProduct,
  getPromotionApiError,
} from '../../models/promotion.model';
import { MasterService } from '../../services/auth.service';

@Component({
  selector: 'app-flash-sales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './flash-sales.html',
  styleUrl: './flash-sales.css',
})
export class FlashSales implements OnInit {
  sales: FlashSale[] = [];
  products: ProductModel[] = [];
  productSearch = '';
  form = this.emptyForm();
  editingId: number | null = null;
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  constructor(private masterService: MasterService, private cdf: ChangeDetectorRef) {}

  get filteredProducts(): ProductModel[] {
    const query = this.productSearch.trim().toLocaleLowerCase();
    if (!query) {
      return this.products;
    }

    return this.products.filter((product) =>
      product.name.toLocaleLowerCase().includes(query) || String(product.id).includes(query)
    );
  }

  ngOnInit(): void {
    this.loadSales();
    this.loadProducts();
  }

  loadSales(): void {
    this.loading = true;
    this.masterService.getFlashSales().subscribe({
      next: (response) => {
        this.sales = Array.isArray(response) ? response : response.results;
        this.loading = false;
        this.cdf.detectChanges();
      },
      error: (error: unknown) => {
        this.errorMessage = getPromotionApiError(error, 'Unable to load flash sales.');
        console.error('Loading flash sales failed.', error);
        this.loading = false;
        this.cdf.detectChanges();
      },
    });
  }

  loadProducts(): void {
    this.masterService.getAllProducts().subscribe({
      next: (products) => {
        this.products = products;
        this.cdf.detectChanges();
      },
      error: (error: unknown) => {
        this.errorMessage = getPromotionApiError(error, 'Unable to load products.');
        console.error('Loading products for flash sales failed.', error);
        this.cdf.detectChanges();
      },
    });
  }

  toggleProduct(productId: number, checked: boolean): void {
    this.form.products = checked
      ? [...this.form.products, productId]
      : this.form.products.filter((id) => id !== productId);
  }

  onProductChange(event: Event, productId: number): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.toggleProduct(productId, target.checked);
    }
  }

  isProductSelected(productId: number): boolean {
    return this.form.products.includes(productId);
  }

  openCreateForm(): void {
    this.editingId = null;
    this.form = this.emptyForm();
    this.productSearch = '';
    this.errorMessage = '';
  }

  editSale(sale: FlashSale): void {
    this.editingId = sale.id;
    this.errorMessage = '';
    this.successMessage = '';
    this.form = {
      title: sale.title,
      products: sale.products.map((product) => typeof product === 'number' ? product : product.id),
      start_time: this.toLocalDateTime(sale.start_time),
      end_time: this.toLocalDateTime(sale.end_time),
      is_active: sale.is_active,
    };
  }

  cancelEdit(): void {
    this.openCreateForm();
    this.successMessage = '';
  }

  saveSale(): void {
    const payload = this.toPayload();
    if (!payload || this.saving) {
      if (!payload) {
        this.errorMessage = 'Enter a title, select at least one product, and choose a valid time range.';
      }
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';
    const request = this.editingId === null
      ? this.masterService.createFlashSale(payload)
      : this.masterService.updateFlashSale(this.editingId, payload);

    request.subscribe({
      next: () => {
        this.successMessage = this.editingId === null ? 'Flash sale created.' : 'Flash sale updated.';
        this.openCreateForm();
        this.loadSales();
        this.saving = false;
        this.cdf.detectChanges();
      },
      error: (error: unknown) => {
        this.errorMessage = getPromotionApiError(error, 'Unable to save this flash sale.');
        console.error('Saving flash sale failed.', error);
        this.saving = false;
        this.cdf.detectChanges();
      },
    });
  }

  deleteSale(sale: FlashSale): void {
    if (!confirm(`Delete the flash sale "${sale.title}"?`)) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.masterService.deleteFlashSale(sale.id).subscribe({
      next: () => {
        this.sales = this.sales.filter((item) => item.id !== sale.id);
        this.successMessage = 'Flash sale deleted.';
        this.cdf.detectChanges();
      },
      error: (error: unknown) => {
        this.errorMessage = getPromotionApiError(error, 'Unable to delete this flash sale.');
        console.error('Deleting flash sale failed.', error);
        this.cdf.detectChanges();
      },
    });
  }

  productNames(sale: FlashSale): string {
    return sale.products.map((product) => this.productName(product)).join(', ');
  }

  private productName(product: number | FlashSaleProduct): string {
    const id = typeof product === 'number' ? product : product.id;
    const responseName = typeof product === 'number' ? undefined : product.name;
    return responseName ?? this.products.find((item) => item.id === id)?.name ?? `#${id}`;
  }

  private toPayload(): FlashSalePayload | null {
    const start = new Date(this.form.start_time);
    const end = new Date(this.form.end_time);
    if (
      !this.form.title.trim()
      || this.form.products.length === 0
      || !this.form.start_time
      || !this.form.end_time
      || !Number.isFinite(start.getTime())
      || !Number.isFinite(end.getTime())
      || end <= start
    ) {
      return null;
    }

    return {
      title: this.form.title.trim(),
      products: [...this.form.products],
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      is_active: this.form.is_active,
    };
  }

  private toLocalDateTime(value: string): string {
    const date = new Date(value);
    const pad = (part: number) => String(part).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private emptyForm(): {
    title: string;
    products: number[];
    start_time: string;
    end_time: string;
    is_active: boolean;
  } {
    return { title: '', products: [], start_time: '', end_time: '', is_active: true };
  }
}
