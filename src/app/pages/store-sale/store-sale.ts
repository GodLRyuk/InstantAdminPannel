import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MasterService } from '../../services/auth.service';
import { ProductModel } from '../../models/products.model';
import { InventoryModel } from '../../models/inventory.model';

interface StoreProduct {
  id: number;
  name: string;
  image: string | null;
  category: string;
  barcode: string;
  price: number;
  availableStock: number;
}

interface BillItem extends StoreProduct { quantity: number; }

@Component({
  selector: 'app-store-sale',
  standalone: true,
  templateUrl: './store-sale.html',
  imports: [CommonModule, FormsModule, RouterLink],
})
export class StoreSale implements OnInit {
  private readonly productPageSize = 20;
  visibleProductCount = this.productPageSize;
  products: StoreProduct[] = [];
  billItems: BillItem[] = [];
  barcode = '';
  searchTerm = '';
  scanMessage = '';
  scanMessageType: 'success' | 'error' | '' = '';
  discount = 0;
  loadingProducts = true;
  submitting = false;
  requestMessage = '';
  requestMessageType: 'success' | 'error' | '' = '';

  constructor(private masterService: MasterService, private cdf: ChangeDetectorRef) {}

  ngOnInit(): void { this.loadProducts(); }

  loadProducts(): void {
    this.loadingProducts = true;
    forkJoin({ products: this.masterService.getAllProducts(), inventory: this.masterService.getInventoryItem() }).subscribe({
      next: ({ products, inventory }) => {
        const productList = Array.isArray(products) ? products : products?.results ?? [];
        const inventoryList = Array.isArray(inventory) ? inventory : inventory?.results ?? [];
        this.products = productList.map((product: ProductModel) => this.toStoreProduct(product, inventoryList));
        this.visibleProductCount = this.productPageSize;
        this.loadingProducts = false;
        this.cdf.detectChanges();
      },
      error: () => {
        this.loadingProducts = false;
        this.requestMessage = 'Could not load products. Please refresh and try again.';
        this.requestMessageType = 'error';
        this.cdf.detectChanges();
      },
    });
  }

  private toStoreProduct(product: ProductModel, inventory: InventoryModel[]): StoreProduct {
    const inventoryItem = inventory.find(row => Number(row.product ?? row.product_id) === Number(product.id));
    const availableStock = Number(inventoryItem?.available_stock ?? 0);
    const category = product.category_name || String(product.category ?? '');
    return {
      id: Number(product.id),
      name: product.name,
      image: product.image || null,
      category: category && category !== 'null' ? category : 'Product',
      barcode: String(product.barcode ?? ''),
      price: Number(product.price) || 0,
      availableStock: Number.isFinite(availableStock) ? Math.max(0, availableStock) : 0,
    };
  }

  get filteredProducts(): StoreProduct[] {
    const query = this.searchTerm.trim().toLowerCase();
    return query ? this.products.filter(product => `${product.name} ${product.category} ${product.barcode}`.toLowerCase().includes(query)) : this.products;
  }

  get visibleProducts(): StoreProduct[] {
    return this.filteredProducts.slice(0, this.visibleProductCount);
  }

  get hasMoreProducts(): boolean {
    return this.visibleProductCount < this.filteredProducts.length;
  }

  onSearchChange(): void {
    this.visibleProductCount = this.productPageSize;
  }

  loadMoreProducts(): void {
    if (this.hasMoreProducts) this.visibleProductCount += this.productPageSize;
  }

  onProductListScroll(event: Event): void {
    const list = event.target as HTMLElement;
    if (list.scrollTop + list.clientHeight >= list.scrollHeight - 80) this.loadMoreProducts();
  }

  get itemCount(): number { return this.billItems.reduce((count, item) => count + item.quantity, 0); }
  get subtotal(): number { return this.billItems.reduce((total, item) => total + item.price * item.quantity, 0); }
  get appliedDiscount(): number { return Math.min(this.subtotal, Math.max(0, Number(this.discount) || 0)); }
  get total(): number { return Math.max(0, this.subtotal - this.appliedDiscount); }

  addByBarcode(): void {
    const scannedBarcode = this.barcode.trim();
    if (!scannedBarcode) { this.setScanMessage('Scan or enter a barcode to add an item.', 'error'); return; }
    const product = this.products.find(item => item.barcode === scannedBarcode);
    this.barcode = '';
    if (!product) { this.setScanMessage('No product found for that barcode.', 'error'); return; }
    if (!this.addProduct(product)) { this.setScanMessage(`${product.name} is out of stock or at its quantity limit.`, 'error'); return; }
    this.setScanMessage(`${product.name} added to the bill.`, 'success');
  }

  addProduct(product: StoreProduct): boolean {
    if (product.availableStock < 1) return false;
    const billItem = this.billItems.find(item => item.id === product.id);
    if (billItem) {
      if (billItem.quantity >= product.availableStock) return false;
      billItem.quantity += 1;
      return true;
    }
    this.billItems = [...this.billItems, { ...product, quantity: 1 }];
    return true;
  }

  isAtStockLimit(product: StoreProduct): boolean {
    const billItem = this.billItems.find(item => item.id === product.id);
    return product.availableStock < 1 || (billItem?.quantity ?? 0) >= product.availableStock;
  }

  changeQuantity(item: BillItem, change: number): void {
    const nextQuantity = item.quantity + change;
    if (nextQuantity < 1) { this.removeItem(item); return; }
    item.quantity = Math.min(nextQuantity, item.availableStock);
  }

  removeItem(item: BillItem): void { this.billItems = this.billItems.filter(billItem => billItem.id !== item.id); }

  clearBill(): void {
    this.billItems = [];
    this.discount = 0;
    this.scanMessage = '';
    this.scanMessageType = '';
    this.requestMessage = '';
    this.requestMessageType = '';
  }

  completeSale(): void {
    if (!this.billItems.length || this.submitting) return;
    this.submitting = true;
    this.requestMessage = '';
    const payload: { items: Array<{ product: number; quantity: number }>; payment_method: 'CASH'; discount?: number } = {
      items: this.billItems.map(item => ({ product: item.id, quantity: item.quantity })),
      payment_method: 'CASH',
    };
    if (this.appliedDiscount > 0) payload.discount = this.appliedDiscount;
    this.masterService.createStoreOrder(payload).subscribe({
      next: () => {
        this.clearBill();
        this.requestMessage = 'Sale completed successfully.';
        this.requestMessageType = 'success';
        this.submitting = false;
        this.cdf.detectChanges();
        this.loadProducts();
      },
      error: error => {
        this.requestMessage = error?.error?.detail || error?.error?.message || 'Sale could not be completed. Please check the bill and try again.';
        this.requestMessageType = 'error';
        this.submitting = false;
        this.cdf.detectChanges();
      },
    });
  }

  private setScanMessage(message: string, type: 'success' | 'error'): void {
    this.scanMessage = message;
    this.scanMessageType = type;
  }
}
