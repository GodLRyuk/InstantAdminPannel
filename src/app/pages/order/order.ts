import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { interval, Subject, startWith, switchMap, takeUntil } from 'rxjs';
import { MasterService } from '../../services/auth.service';
import { OrderModel } from '../../models/order.model';
import { getVisiblePageNumbers } from '../../shared/pagination';
import {
  escapeReceiptText,
  formatReceiptCurrency,
  formatReceiptDate,
  printThermalReceipt,
} from '../../shared/thermal-receipt';

@Component({
  selector: 'app-order',
  standalone: false,
  templateUrl: './order.html',
  styleUrls: ['./order.css']
})
export class OrdersComponent implements OnInit, OnDestroy {

  selectedTab: string = 'all';

  orders: OrderModel[] = [];
  filteredOrders: OrderModel[] = [];
  paginatedOrders: OrderModel[] = [];

  loading: boolean = false;
  showModal = false;

  notificationMessage = '';
  notificationVisible = false;
  lastOrderCount = 0;
  highlightedOrderIds = new Set<number>();
  private destroy$ = new Subject<void>();

  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;

  items: { product: number; quantity: number }[] = [
    { product: 0, quantity: 1 }
  ];

  coupon_code: string = '';

  constructor(
    private masterService: MasterService,
    private cdf: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.masterService.newOrderIds$
      .pipe(takeUntil(this.destroy$))
      .subscribe((ids: number[]) => {
        this.highlightedOrderIds = new Set(ids);
        this.cdf.detectChanges();
      });

    this.startOrderPolling();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  startOrderPolling() {
    interval(5000)
      .pipe(
        startWith(0),
        switchMap(() => this.masterService.getOrders()),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (data: OrderModel[]) => {
          this.orders = data || [];

          this.applyFilter();
          this.updatePagination();
          this.cdf.detectChanges();
        },
        error: err => console.error(err)
      });
  }

  // ✅ LOAD ORDERS
  loadOrders() {
    this.masterService.getOrders().subscribe({
      next: (data: OrderModel[]) => {
        this.orders = data;

        this.applyFilter();
        this.updatePagination();

        this.cdf.detectChanges();
      },
      error: err => console.error(err)
    });
  }

  // ✅ FILTER
  filterOrders(tab: string) {
    this.selectedTab = tab;
    this.currentPage = 1;

    this.applyFilter();
    this.updatePagination();
  }

  // ✅ FILTER LOGIC
  applyFilter() {
    if (this.selectedTab === 'all') {
      this.filteredOrders = this.orders;
    } else {
      this.filteredOrders = this.orders.filter(
        o => o.order_status.toLowerCase() === this.selectedTab
      );
    }
  }

  // =========================
  // PAGINATION
  // =========================

  updatePagination() {
    this.totalPages = Math.max(1, Math.ceil(this.filteredOrders.length / this.itemsPerPage));

    // clamp to last valid page instead of resetting to page 1
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    this.updatePaginatedOrders();
  }

  updatePaginatedOrders() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;

    this.paginatedOrders = this.filteredOrders.slice(start, end);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;

    this.currentPage = page;
    this.updatePaginatedOrders();
  }

  get pages(): number[] {
    return getVisiblePageNumbers(this.currentPage, this.totalPages);
  }

  printReceipt(order: OrderModel): void {
    const items = order.items.map(item => `
      <div class="item">
        <div>${escapeReceiptText(item.product_name)}</div>
        ${item.subcategory_name ? `<div class="muted">${escapeReceiptText(item.subcategory_name)}</div>` : ''}
        <div class="row">
          <span>${escapeReceiptText(item.quantity)} × ${formatReceiptCurrency(item.price)}</span>
          <strong>${formatReceiptCurrency(item.total_price)}</strong>
        </div>
      </div>
    `).join('');
    const itemTotal = order.item_total ?? String(
      order.items.reduce((total, item) => total + Number(item.total_price || 0), 0)
    );
    const coupon = order.coupon_code
      ? `<p>Coupon: ${escapeReceiptText(order.coupon_code)}</p>`
      : '';
    const customerDetails = [
      order.customer_name ? `<p>Customer: ${escapeReceiptText(order.customer_name)}</p>` : '',
      order.customer_phone ? `<p>Phone: ${escapeReceiptText(order.customer_phone)}</p>` : '',
      order.delivery_address ? `<p>Deliver to: ${escapeReceiptText(order.delivery_address)}</p>` : '',
    ].join('');
    const additionalCharges = [
      order.delivery_fee !== undefined
        ? `<div class="row"><span>Delivery fee</span><span>${formatReceiptCurrency(order.delivery_fee)}</span></div>`
        : '',
      order.packaging_charge !== undefined
        ? `<div class="row"><span>Packaging</span><span>${formatReceiptCurrency(order.packaging_charge)}</span></div>`
        : '',
      order.gst !== undefined
        ? `<div class="row"><span>GST</span><span>${formatReceiptCurrency(order.gst)}</span></div>`
        : '',
    ].join('');

    printThermalReceipt(`Instant Delivery - Order ${order.id}`, `
      <h1>Instant Delivery</h1>
      <p class="center">Order Receipt</p>
      <p class="center">Order #${escapeReceiptText(order.id)}</p>
      <p class="center muted">${formatReceiptDate(order.created_at)}</p>
      ${customerDetails}
      <div class="divider"></div>
      <h2>Items</h2>
      ${items}
      <div class="divider"></div>
      <div class="row"><span>Items</span><span>${formatReceiptCurrency(itemTotal)}</span></div>
      <div class="row"><span>Discount</span><span>−${formatReceiptCurrency(order.discount_amount)}</span></div>
      ${coupon}
      ${additionalCharges}
      <div class="row total"><span>Total</span><span>${formatReceiptCurrency(order.total_amount)}</span></div>
      <div class="divider"></div>
      <p>Status: ${escapeReceiptText(order.order_status)}</p>
      <p>Payment: ${escapeReceiptText(order.payment_status)}</p>
      <p class="center">Thank you</p>
    `);
  }

  // =========================
  // ORDER STATUS UPDATE
  // =========================

  updateStatus(order: OrderModel, newStatus: string) {
    this.masterService.stopOrderNotification();
    this.highlightedOrderIds.delete(order.id);
    this.cdf.detectChanges();
    this.loading = true;

    this.masterService.updateOrderStatus(order.id, { status: newStatus }).subscribe({
      next: () => {
        this.loading = false;
        this.loadOrders();
      },
      error: err => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  // =========================
  // MODAL
  // =========================

  openCreateModal() {
    this.items = [{ product: 0, quantity: 1 }];
    this.coupon_code = '';
    this.showModal = true;
  }

  addItem() {
    this.items.push({ product: 0, quantity: 1 });
  }

  removeItem(index: number) {
    this.items.splice(index, 1);
    // ✅ removed loadOrders() — unrelated to the create-order form array
  }
}