import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { DashboardComponent } from './components/pages/dashboard/dashboard'; 
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout';
import { Brand } from './pages/brand/brand';
import { Unit } from './pages/unit/unit';
import { Category } from './pages/category/category';
import { Subcategory } from './pages/subcategory/subcategory';
import { OrdersComponent } from './pages/order/order';
import { Products } from './pages/products/products';
import { BannerComponent } from './pages/banner/banner';
import { Advbanner } from './pages/advbanner/advbanner';
import { SalesReport } from './reports/sales-report/sales-report';
import { BrandProductsReport } from './reports/brand-products-report/brand-products-report';
import { Settlements } from './pages/settlements/settlements';
import { StoreTiming } from './pages/store-timing/store-timing';
import { Expense } from './pages/expense/expense';
import { StockAdjustmentComponent } from './pages/stock-adjustment-component/stock-adjustment-component';
import { Users } from './pages/users/users';
import { authGuard } from './guards/auth.guard';
import { roleAccessGuard } from './guards/role-access.guard';

const routes: Routes = [
  {path: '', component: LoginComponent},
  {
    path: 'privacy-policy',
    loadComponent: () =>
      import('./components/privacy-policy/privacy-policy').then(module => module.PrivacyPolicyComponent),
  },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [roleAccessGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'brand', component: Brand },
      { path: 'unit', component: Unit },
      { path: 'category', component: Category },
      { path: 'subcategory', component: Subcategory },
      { path: 'orders', component: OrdersComponent },
      { path: 'users', component: Users },
      { path: 'products', component: Products },
      {
        path: 'bundles',
        loadComponent: () =>
          import('./pages/bundles/bundles').then(module => module.Bundles),
      },
      {
        path: 'promotions/coupons',
        loadComponent: () =>
          import('./pages/coupon-validation/coupon-validation').then(module => module.CouponManagement),
      },
      {
        path: 'promotions/flash-sales',
        loadComponent: () =>
          import('./pages/flash-sales/flash-sales').then(module => module.FlashSales),
      },
      {
        path: 'stock',
        loadComponent: () => import('./pages/stock/stock').then(module => module.Stock),
      },
      {
        path: 'inventory',
        loadComponent: () => import('./pages/inventory/inventory').then(module => module.Inventory),
      },
      {
        path: 'store-sale',
        loadComponent: () => import('./pages/store-sale/store-sale').then(module => module.StoreSale),
      },
      {
        path: 'store-orders',
        loadComponent: () => import('./pages/store-orders/store-orders').then(module => module.StoreOrders),
      },
      { path: 'banner', component: BannerComponent },
      { path: 'advbanner', component: Advbanner },
      { path: 'reports/sales', component: SalesReport },
      { path: 'reports/brand-products', component: BrandProductsReport },
      {
        path: 'reports/ai-analytics',
        loadComponent: () =>
          import('./reports/ai-analytics/ai-analytics').then(module => module.AiAnalytics),
      },
      { path: 'settlements', component: Settlements },
      { path: 'expenses', component: Expense },
      { path: 'store-timing', component: StoreTiming },
      { path: 'stock-adjustments', component: StockAdjustmentComponent },
      {
        path: 'restaurants',
        loadChildren: () =>
          import('./restaurants/restaurants.routes').then((m) => m.RESTAURANT_ROUTES),
      },
    ]
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
