import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface StoreProduct {
  id: number;
  name: string;
  category: string;
  barcode: string;
  price: number;
  stock: number;
}

interface BillItem extends StoreProduct {
  quantity: number;
}

@Component({
  selector: 'app-store-sale',
  standalone: true,
  templateUrl: './store-sale.html',
  imports: [CommonModule, FormsModule, RouterLink],
})
export class StoreSale {
  readonly products: StoreProduct[] = [
    { id: 1, name: 'Whole Milk', category: 'Dairy', barcode: '890100100001', price: 32, stock: 18 },
    { id: 2, name: 'Brown Bread', category: 'Bakery', barcode: '890100100002', price: 45, stock: 12 },
    { id: 3, name: 'Farm Fresh Eggs', category: 'Dairy', barcode: '890100100003', price: 72, stock: 8 },
    { id: 4, name: 'Classic Oats', category: 'Breakfast', barcode: '890100100004', price: 115, stock: 24 },
    { id: 5, name: 'Masala Noodles', category: 'Snacks', barcode: '890100100005', price: 28, stock: 31 },
    { id: 6, name: 'Orange Juice', category: 'Beverages', barcode: '890100100006', price: 89, stock: 10 },
  ];

  billItems: BillItem[] = [];
  barcode = '';
  searchTerm = '';
  scanMessage = '';
  scanMessageType: 'success' | 'error' | '' = '';

  get filteredProducts(): StoreProduct[] {
    const query = this.searchTerm.trim().toLowerCase();
    if (!query) return this.products;

    return this.products.filter(product =>
      `${product.name} ${product.category} ${product.barcode}`.toLowerCase().includes(query)
    );
  }

  get itemCount(): number {
    return this.billItems.reduce((count, item) => count + item.quantity, 0);
  }

  get subtotal(): number {
    return this.billItems.reduce((total, item) => total + item.price * item.quantity, 0);
  }

  addByBarcode(): void {
    const scannedBarcode = this.barcode.trim();
    if (!scannedBarcode) {
      this.setScanMessage('Scan or enter a barcode to add an item.', 'error');
      return;
    }

    const product = this.products.find(item => item.barcode === scannedBarcode);
    this.barcode = '';

    if (!product) {
      this.setScanMessage('No product found for that barcode.', 'error');
      return;
    }

    if (!this.addProduct(product)) {
      this.setScanMessage(`${product.name} is out of stock or at its quantity limit.`, 'error');
      return;
    }

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
    if (nextQuantity < 1) {
      this.removeItem(item);
      return;
    }

    item.quantity = Math.min(nextQuantity, item.stock);
  }

  removeItem(item: BillItem): void {
    this.billItems = this.billItems.filter(billItem => billItem.id !== item.id);
  }

  clearBill(): void {
    this.billItems = [];
    this.scanMessage = '';
    this.scanMessageType = '';
  }

  private setScanMessage(message: string, type: 'success' | 'error'): void {
    this.scanMessage = message;
    this.scanMessageType = type;
  }
}
