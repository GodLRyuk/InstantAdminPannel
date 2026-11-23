import { RestaurantPaymentsComponent } from './restaurant-payments.component';
import { Routes } from '@angular/router';
import { RestaurantFormComponent } from './restaurant-form.component';
import { RestaurantOrdersComponent } from './restaurant-orders.component';
import { RestaurantsListComponent } from './restaurants-list.component';
import { RestaurantMenuComponent } from './restaurant-menu.component';
import { RestaurantMenuItemsComponent } from './restaurant-menu-items.component';

// Mounted at /restaurants in app.routes.ts. Keep 'new' and 'orders' above ':id'.
export const RESTAURANT_ROUTES: Routes = [
  { path: '', component: RestaurantsListComponent },
  { path: 'new', component: RestaurantFormComponent },
  { path: 'orders', component: RestaurantOrdersComponent },
  { path: 'menu-items', component: RestaurantMenuItemsComponent },
  { path: 'menu-categories', component: RestaurantMenuComponent },
  {
    path: 'reports/sales',
    loadComponent: () => import('./restaurant-sales-report.component').then(m => m.RestaurantSalesReportComponent),
  },
  ...['vendor-onboarding', 'commissions', 'payment-splits', 'refunds', 'payment-operations'].map(path => ({ path, component: RestaurantPaymentsComponent })),
  { path: ':id', component: RestaurantFormComponent },
];
