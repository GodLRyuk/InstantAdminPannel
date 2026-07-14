import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent {
constructor(private router: Router) {}
  goToOrders() {
  this.router.navigate(['/orders']);
}
goToAppProduct()
{
  this.router.navigate(['/products']);
}
goToAppStock()
{
  this.router.navigate(['/stock']);
}
goToAppInventory()
{
  this.router.navigate(['/inventory']);
}
goToSalesReport() {
  this.router.navigate(['/reports/sales']);
}
}