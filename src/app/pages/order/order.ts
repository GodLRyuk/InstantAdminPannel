import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MasterService } from '../../services/auth.service';
import { OrderModel } from '../../models/order.model';

@Component({
  selector: 'app-order',
  standalone: false,
  templateUrl: './order.html',
  styleUrls: ['./order.css']
})
export class OrdersComponent implements OnInit {

  selectedTab: string = 'all';

  orders: OrderModel[] = [];
  filteredOrders: OrderModel[] = [];
  paginatedOrders: OrderModel[] = [];

  loading: boolean = false;
  showModal = false;

  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;

  items: { product: number; quantity: number }[] = [
    { product: 0, quantity: 1 }
  ];

  coupon_code: string = '';

  constructor(
    private masterService: MasterService,
    private cdf: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  // ✅ LOAD ORDERS
  loadOrders() {
    this.masterService.getOrders().subscribe({
      next: (data: OrderModel[]) => {
        this.orders = data;

        this.applyFilter();
        this.updatePagination();   // 🔥 FIXED FLOW

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
    this.updatePagination();   // 🔥 IMPORTANT FIX
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
  // 🔥 PAGINATION (FIXED FLOW)
  // =========================

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredOrders.length / this.itemsPerPage);

    // prevent invalid page crash
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
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

  // =========================
  // 🔥 ORDER STATUS UPDATE
  // =========================

  updateStatus(order: OrderModel, newStatus: string) {
    this.loading = true;

    this.masterService.updateOrderStatus(order.id, { status: newStatus }).subscribe({
      next: () => {
        this.loading = false;
        this.loadOrders(); // refresh cleanly
      },
      error: err => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  // =========================
  // 🔥 MODAL
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
    this.loadOrders();
  }
}