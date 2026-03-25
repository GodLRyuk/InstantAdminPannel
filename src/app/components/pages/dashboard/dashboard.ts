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
}