import { Routes } from '@angular/router';
import { RestaurantFormComponent } from './restaurant-form.component';
import { RestaurantOrdersComponent } from './restaurant-orders.component';
import { RestaurantsListComponent } from './restaurants-list.component';
import { RestaurantMenuComponent } from './restaurant-menu.component';

// Mounted at /restaurants in app.routes.ts. Keep 'new' and 'orders' above ':id'.
export const RESTAURANT_ROUTES: Routes = [
  { path: '', component: RestaurantsListComponent },
  { path: 'new', component: RestaurantFormComponent },
  { path: 'orders', component: RestaurantOrdersComponent },
  { path: 'menu-categories', component: RestaurantMenuComponent },
  { path: ':id', component: RestaurantFormComponent },
];
