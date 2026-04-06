import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MasterService } from '../../services/auth.service';
import { OrderModel, CreateOrderModel } from '../../models/order.model';

@Component({
  selector: 'app-order',
  standalone: false,
  templateUrl: './order.html',
  styleUrls: ['./order.css']
})
export class OrdersComponent implements OnInit {

  selectedTab: string = 'all';

  orders: OrderModel[] = [];          // ✅ typed
  filteredOrders: OrderModel[] = [];  // ✅ typed
  loading: boolean = false;  // ✅ loader flag
  showModal = false;

  // ✅ Create order payload
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
      this.filterOrders(this.selectedTab);  // ✅ use current tab
      this.cdf.detectChanges();             // ✅ ensure view updates
    },
    error: err => console.error(err)
  });
}
  // ✅ FILTER
  filterOrders(tab: string) {
    this.selectedTab = tab;

    if (tab === 'all') {
      this.filteredOrders = this.orders;
    } else {
      this.filteredOrders = this.orders.filter(
        o => o.order_status.toLowerCase() === tab
      );
    }
  }

  // ✅ MODAL
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
  // ✅ UPDATE STATUS
  updateStatus(order: OrderModel, newStatus: string) {
  this.loading = true; // optional loader

  this.masterService.updateOrderStatus(order.id, { status: newStatus }).subscribe({
    next: () => {
      this.loading = false; // hide loader if using
      // reload the entire page
      window.location.reload();
    },
    error: err => {
      console.error('Status update error', err);
      this.loading = false; // hide loader on error
    }
  });
}
}