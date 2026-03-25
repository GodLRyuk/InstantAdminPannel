import { Component } from '@angular/core';

@Component({
  selector: 'app-order',
  standalone: false,
  templateUrl: './order.html',
  styleUrls: ['./order.css'],   // ✅ FIXED (plural)
})
export class OrdersComponent {

  selectedTab: string = 'all';

  orders = [
    { id: 1, status: 'confirmed', amount: 500 },
    { id: 2, status: 'pending', amount: 300 },
    { id: 3, status: 'confirmed', amount: 800 },
    { id: 4, status: 'pending', amount: 200 }
  ];

  filteredOrders = this.orders;

  filterOrders(type: string) {
    this.selectedTab = type;

    if (type === 'all') {
      this.filteredOrders = this.orders;
    } else {
      this.filteredOrders = this.orders.filter(o => o.status === type);
    }
  }
}