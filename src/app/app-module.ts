import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import {
  HTTP_INTERCEPTORS,
  HttpClientModule,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { DashboardComponent } from './components/pages/dashboard/dashboard';
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout';
import { Header } from './components/header/header';
import { Footer } from './components/footer/footer';
import { Brand } from './pages/brand/brand';
import { Unit } from './pages/unit/unit';
import { Category } from './pages/category/category';
import { AuthInterceptor } from './interceptors/auth-interceptor';
import { Subcategory } from './pages/subcategory/subcategory';
import { OrdersComponent } from './pages/order/order';
import { Products } from './pages/products/products';
import { Stock } from './pages/stock/stock';
import { Inventory } from './pages/inventory/inventory';
import { OrderModel } from './models/order.model';
import { CommonModule } from '@angular/common';
import { BannerComponent } from './pages/banner/banner';
import { Advbanner } from './pages/advbanner/advbanner';
import { SalesReport } from './reports/sales-report/sales-report';

@NgModule({
  declarations: [
    App,
    DashboardComponent,
    AdminLayoutComponent,
    Header,
    Footer,
    Brand,
    Unit,
    Category,
    Subcategory,
    Products,
    Stock,
    Inventory,
    OrdersComponent,
    BannerComponent,
    Advbanner,
    SalesReport,
  ],
  imports: [BrowserModule, AppRoutingModule, FormsModule, HttpClientModule, CommonModule],
  providers: [
    provideBrowserGlobalErrorListeners(),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
  ],
  bootstrap: [App],
})
export class AppModule {}
