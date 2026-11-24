import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MasterService } from '../../services/auth.service';
import { OrderModel } from '../../models/order.model';
import {
  escapeReceiptText,
  formatReceiptCurrency,
  formatReceiptDate,
  printThermalReceipt,
} from '../../shared/thermal-receipt';

@Component({
  selector: 'app-store-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './store-orders.html',
  styleUrl: './store-orders.css',
})
export class StoreOrders implements OnInit {
  orders: OrderModel[] = [];
  selectedOrder: OrderModel | null = null;
  searchTerm = '';
  loading = false;
  errorMessage = '';

  constructor(private readonly masterService: MasterService, private readonly cdf: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading = true;
    this.errorMessage = '';
    this.masterService.getStoreSales().subscribe({
      next: response => {
        this.orders = Array.isArray(response) ? response : response.results ?? [];
        this.loading = false;
        this.cdf.detectChanges();
      },
      error: () => {
        this.orders = [];
        this.loading = false;
        this.errorMessage = 'Could not load store orders. Please try again.';
        this.cdf.detectChanges();
      },
    });
  }

  get filteredOrders(): OrderModel[] {
    const query = this.searchTerm.trim().toLowerCase();
    if (!query) return this.orders;

    return this.orders.filter(order => {
      const itemNames = (order.items ?? []).map(item => item.product_name).join(' ');
      return `${order.id} ${order.customer_name ?? ''} ${order.customer_phone ?? ''} ${itemNames}`
        .toLowerCase()
        .includes(query);
    });
  }

  totalItems(order: OrderModel): number {
    return (order.items ?? []).reduce((total, item) => total + Number(item.quantity || 0), 0);
  }

  printBill(order: OrderModel): void {
    const items = (order.items ?? []).map(item => `
      <div class="item">
        <div>${escapeReceiptText(item.product_name)}</div>
        <div class="row">
          <span>${escapeReceiptText(item.quantity)} × ${formatReceiptCurrency(item.price)}</span>
          <strong>${formatReceiptCurrency(item.total_price)}</strong>
        </div>
      </div>
    `).join('');
    const adjustments = [
      { label: 'Discount', amount: order.discount_amount, prefix: '−' },
      { label: 'Packaging', amount: order.packaging_charge, prefix: '' },
      { label: 'GST', amount: order.gst, prefix: '' },
    ].map(({ label, amount, prefix }) => amount && Number(amount) !== 0
      ? `<div class="row"><span>${label}</span><span>${prefix}${formatReceiptCurrency(amount)}</span></div>`
      : ''
    ).join('');

    printThermalReceipt(`Instant Delivery - Store Order ${order.id}`, `
      <h1>Instant Delivery</h1>
      <p class="center">Store bill #${escapeReceiptText(order.id)}</p>
      <p class="center muted">${formatReceiptDate(order.created_at)}</p>
      <p>Customer: ${escapeReceiptText(order.customer_name || 'Walk-in customer')}</p>
      <div class="divider"></div>
      ${items}
      <div class="divider"></div>
      ${adjustments}
      <div class="row total"><span>Total</span><span>${formatReceiptCurrency(order.total_amount)}</span></div>
      <p>Payment: ${escapeReceiptText(order.payment_status || 'Paid')}</p>
    `);
  }

  toggleOrder(order: OrderModel): void {
    this.selectedOrder = this.selectedOrder?.id === order.id ? null : order;
  }

  closeOrder(): void {
    this.selectedOrder = null;
  }

  trackByOrderId(_index: number, order: OrderModel): number {
    return order.id;
  }
}
