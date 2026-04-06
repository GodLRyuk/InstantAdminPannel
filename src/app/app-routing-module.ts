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
import { Stock } from './pages/stock/stock';
import { Inventory } from './pages/inventory/inventory';
import { BannerComponent } from './pages/banner/banner';
import { Advbanner } from './pages/advbanner/advbanner';

const routes: Routes = [
  {path: '', component: LoginComponent},
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'brand', component: Brand },
      { path: 'unit', component: Unit },
      { path: 'category', component: Category },
      { path: 'subcategory', component: Subcategory },
      { path: 'orders', component: OrdersComponent },
      { path: 'products', component: Products },
      { path: 'stock', component: Stock },
      { path: 'inventory', component: Inventory },
      { path: 'banner', component: BannerComponent },
      { path: 'advbanner', component: Advbanner }
    ]
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
