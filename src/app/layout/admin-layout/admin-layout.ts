import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-layout',
  standalone: false,
  templateUrl: './admin-layout.html',
  styleUrls: ['./admin-layout.css']
})
export class AdminLayoutComponent {
  reportsOpen = false;

  toggleReports() {
    this.reportsOpen = !this.reportsOpen;
  }
}
