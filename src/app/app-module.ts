import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
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
    OrdersComponent,
    Products,
    Stock,
  ],
  imports: [BrowserModule, AppRoutingModule, FormsModule],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
  ],
  bootstrap: [App],
})
export class AppModule {}
