import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MasterService } from '../../services/auth.service';
import { ProductModel } from '../../models/products.model';
import { StockModel } from '../../models/stock.model';

interface StoreProduct {
  id: number;
  name: string;
  category: string;
  barcode: string;
  price: number;
  stock: number;
}

interface BillItem extends StoreProduct { quantity: number; }

@Component({
  selector: 'app-store-sale',
  standalone: true,
  templateUrl: './store-sale.html',
  imports: [CommonModule, FormsModule, RouterLink],
})
export class StoreSale implements OnInit {
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

  constructor(private masterService: MasterService) {}

  ngOnInit(): void { this.loadProducts(); }

  loadProducts(): void {
    this.loadingProducts = true;
    forkJoin({ products: this.masterService.getAllProducts(), stock: this.masterService.getAllstock(true) }).subscribe({
      next: ({ products, stock }) => {
        const productList = Array.isArray(products) ? products : products?.results ?? [];
        const stockList = Array.isArray(stock) ? stock : [];
        this.products = productList.map((product: ProductModel) => this.toStoreProduct(product, stockList));
        this.loadingProducts = false;
      },
      error: () => {
        this.loadingProducts = false;
        this.requestMessage = 'Could not load products. Please refresh and try again.';
        this.requestMessageType = 'error';
      },
    });
  }

  private toStoreProduct(product: ProductModel, stock: StockModel[]): StoreProduct {
    const rows = stock.filter(row => Number(row.product) === Number(product.id));
    const quantity = rows.reduce((total, row) => total + Number(row.quantity || 0), 0);
    const category = typeof product.category === 'object' ? (product.category as any).name : String(product.category ?? '');
    return {
      id: Number(product.id),
      name: product.name,
      category: category && category !== 'null' ? category : 'Product',
      barcode: String(product.barcode ?? ''),
      price: Number(product.price) || 0,
      stock: quantity,
    };
  }

  get filteredProducts(): StoreProduct[] {
    const query = this.searchTerm.trim().toLowerCase();
    return query ? this.products.filter(product => `${product.name} ${product.category} ${product.barcode}`.toLowerCase().includes(query)) : this.products;
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
    if (product.stock < 1) return false;
    const billItem = this.billItems.find(item => item.id === product.id);
    if (billItem) {
      if (billItem.quantity >= product.stock) return false;
      billItem.quantity += 1;
      return true;
    }
    this.billItems = [...this.billItems, { ...product, quantity: 1 }];
    return true;
  }

  isAtStockLimit(product: StoreProduct): boolean {
    const billItem = this.billItems.find(item => item.id === product.id);
    return product.stock < 1 || (billItem?.quantity ?? 0) >= product.stock;
  }

  changeQuantity(item: BillItem, change: number): void {
    const nextQuantity = item.quantity + change;
    if (nextQuantity < 1) { this.removeItem(item); return; }
    item.quantity = Math.min(nextQuantity, item.stock);
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
        this.loadProducts();
      },
      error: error => {
        this.requestMessage = error?.error?.detail || error?.error?.message || 'Sale could not be completed. Please check the bill and try again.';
        this.requestMessageType = 'error';
        this.submitting = false;
      },
    });
  }

  private setScanMessage(message: string, type: 'success' | 'error'): void {
    this.scanMessage = message;
    this.scanMessageType = type;
  }
}
