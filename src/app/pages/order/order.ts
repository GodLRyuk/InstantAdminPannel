import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { interval, Subject, startWith, switchMap, takeUntil } from 'rxjs';
import { MasterService } from '../../services/auth.service';
import { OrderModel } from '../../models/order.model';

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
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
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