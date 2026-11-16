import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MasterService } from '../../services/auth.service';
import { OrderModel } from '../../models/order.model';

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
