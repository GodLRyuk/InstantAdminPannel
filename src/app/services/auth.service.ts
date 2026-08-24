import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { BrandModel } from '../models/brand.model';
import { UnitModel } from '../models/unit.model';
import { CategoryModel } from '../models/category.model';
import { SubCategoryModel } from '../models/sub-category.model';
import { ProductModel } from '../models/products.model';
import { StockModel } from '../models/stock.model';
import { OrderModel } from '../models/order.model';
import { BannerModel } from '../models/banner.model';
import { advBannerModel } from '../models/advbanner.model';
import { RecordRemittancePayload } from '../models/settlements.model';
import { ExpenseCategoryModel, ExpenseModel, ExpenseSummaryModel } from '../models/expense.model';
import { StoreScheduleModel, StoreStatusModel } from '../models/store-schedule.model';
import { StockAdjustmentModel } from '../models/stock-adjustment.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = `${environment.apiUrl}/accounts/admin-login/`;

  constructor(private http: HttpClient) { }

  login(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  refreshToken(refresh: string) {

    console.log("auth Print in auth rervice");
    return this.http.post<any>(`${environment.apiUrl}/token/refresh/`, {
      refresh: refresh
    });
  }
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh');
    localStorage.clear();
  }
}

@Injectable({
  providedIn: 'root'
})
export class MasterService {

  private apiUrl = `${environment.apiUrl}`;
  private stopOrderNotificationSubject = new Subject<void>();
  orderNotificationStop$ = this.stopOrderNotificationSubject.asObservable();
  private newOrderIdsSubject = new Subject<number[]>();
  newOrderIds$ = this.newOrderIdsSubject.asObservable();

  constructor(private http: HttpClient) { }

  // ✅ Return Brand[] instead of BrandComponent[]
  getAllBrands(): Observable<BrandModel[]> {
    return this.http.get<BrandModel[]>(`${this.apiUrl}/masters/brands/`);
  }

  addBrand(data: Partial<BrandModel>): Observable<any> {
    return this.http.post(`${this.apiUrl}/masters/brands/`, data);
  }

  updateBrand(id: number, data: Partial<BrandModel>): Observable<any> {
    return this.http.put(`${this.apiUrl}/masters/brands/${id}/`, data);
  }

  deleteBrand(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/masters/brands/${id}/`);
  }

  getAllunits(): Observable<UnitModel[]> {
    return this.http.get<UnitModel[]>(`${this.apiUrl}/masters/units/`);
  }
  addUnit(data: Partial<UnitModel>): Observable<any> {
    return this.http.post(`${this.apiUrl}/masters/units/`, data);
  }

  updateUnit(id: number, data: Partial<UnitModel>): Observable<any> {
    return this.http.put(`${this.apiUrl}/masters/units/${id}/`, data);
  }

  deleteUnit(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/masters/units/${id}/`);
  }

  getAllCat(): Observable<CategoryModel[]> {

    return this.http.get<CategoryModel[]>(
      `${this.apiUrl}/masters/categories/`,
    );
  }
  addCat(data: FormData) {
    return this.http.post(`${this.apiUrl}/masters/categories/`, data);
  }

  updateCat(id: number, data: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/masters/categories/${id}/`, data);
  }

  deleteCat(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/masters/categories/${id}/`);
  }
  getAllCatforSub(): Observable<any> {

    return this.http.get<SubCategoryModel[]>(
      `${this.apiUrl}/masters/categories/`,
    );
  }
  getAllSubCat(): Observable<any> {
    return this.http.get<SubCategoryModel[]>(
      `${this.apiUrl}/masters/subcategories/`,
    );
  }
  addSubCat(data: Partial<SubCategoryModel>): Observable<any> {

    return this.http.post<SubCategoryModel[]>(
      `${this.apiUrl}/masters/subcategories/`, data
    );
  }
  updateSubCat(id: number, data: Partial<SubCategoryModel>): Observable<any> {
    return this.http.put(`${this.apiUrl}/masters/subcategories/${id}/`, data);
  }
  deleteSubCat(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/masters/subcategories/${id}/`);
  }



  getAllProducts(): Observable<any> {

    return this.http.get<ProductModel[]>(
      `${this.apiUrl}/products/`,
    );
  }
  addProduct(data: FormData): Observable<any> {

    return this.http.post<ProductModel[]>(
      `${this.apiUrl}/products/`, data
    );
  }
  updateProduct(id: number, data: FormData): Observable<any> {
  return this.http.put<ProductModel[]>(
    `${this.apiUrl}/products/${id}/`, data
  );
}
  deleteproduct(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/products/${id}/`);
  }


  getAllstock(): Observable<any> {

    return this.http.get<StockModel[]>(
      `${this.apiUrl}/stock/`,
    );
  }

  addStock(data: Partial<StockModel>): Observable<any> {

    return this.http.post<StockModel[]>(
      `${this.apiUrl}/stock/add/`, data
    );
  }
  updateStock(id: number, data: Partial<StockModel>): Observable<any> {
    return this.http.put(`${this.apiUrl}/stock/update/${id}/`, data);
  }
  deleteStock(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/stock/delete/${id}/`);
  }

  getInventoryItem(): Observable<any> {
    return this.http.get<StockModel[]>(
      `${this.apiUrl}/stock/inventory/`,
    );
  }
  // GET ORDERS
  getOrders(): Observable<any> {
    return this.http.get<OrderModel[]>(
      `${this.apiUrl}/orders/`,
    );
  }

  updateOrderStatus(id: number, data: { status: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/orders/${id}/status/`, data);
  }

  emitNewOrderIds(orderIds: number[]): void {
    this.newOrderIdsSubject.next(orderIds);
  }

  stopOrderNotification(): void {
    this.stopOrderNotificationSubject.next();
  }

  addBanner(data: Partial<BannerModel>, imageFile: File) {
    const formData = new FormData();

    formData.append('title', data.title || '');
    formData.append('link', data.link || '');
    formData.append('is_active', String(data.is_active));

    if (imageFile) {
      formData.append('image', imageFile);
    }

    return this.http.post<any>(`${this.apiUrl}/masters/banners/`, formData);
  }

  // Update existing banner (with optional image)
  updateBanner(id: number, data: Partial<BannerModel>, imageFile?: File) {
    const formData = new FormData();

    formData.append('title', data.title || '');
    formData.append('link', data.link || '');
    formData.append('is_active', String(data.is_active));

    if (imageFile) {
      formData.append('image', imageFile);
    }

    return this.http.put<any>(`${this.apiUrl}/masters/banners/${id}/`, formData);
  }

  // Delete banner
  deleteBanner(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/masters/banners/${id}/`);
  }

  // Get all banners
  getBanners(): Observable<BannerModel[]> {
    return this.http.get<BannerModel[]>(`${this.apiUrl}/masters/banners/`);
  }

  addAdvBanner(data: Partial<advBannerModel>, imageFile?: File): Observable<any> {
    const formData = new FormData();
    formData.append('is_active', data.is_active ? 'true' : 'false');

    if (imageFile) formData.append('image', imageFile);

    return this.http.post(`${this.apiUrl}/masters/advbanners/`, formData);
  }

  // Update existing banner (with optional image)
  updateAdvBanner(id: number, data: Partial<advBannerModel>, imageFile?: File): Observable<any> {
    const formData = new FormData();
    if (data.is_active !== undefined) formData.append('is_active', data.is_active ? 'true' : 'false');

    if (imageFile) formData.append('image', imageFile);

    return this.http.put(`${this.apiUrl}/masters/advbanners/${id}/`, formData);
  }

  // Delete banner
  deleteAdvBanner(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/masters/advbanners/${id}/`);
  }

  // Get all banners
  getAdvBanners(): Observable<advBannerModel[]> {
    return this.http.get<advBannerModel[]>(`${this.apiUrl}/masters/advbanners/`);
  }

  getSalesTrend(startDate: string, endDate: string) {
    return this.http.get(
      `${this.apiUrl}/reports/sales-trend/?start_date=${startDate}&end_date=${endDate}`
    );
  }

  downloadSalesReport(startDate: string, endDate: string) {
    return this.http.get(
      `${this.apiUrl}/reports/sales-export/?start_date=${startDate}&end_date=${endDate}`,
      { responseType: 'blob' }
    );
  }

  downloadBrandProductsReport() {
    return this.http.get(
      `${this.apiUrl}/reports/brand-products-export/`,
      { responseType: 'blob' }
    );
  }

// ── COD SETTLEMENTS ──────────────────────────────
getPendingSettlements(): Observable<any> {
  return this.http.get(`${this.apiUrl}/orders/admin/settlements/pending/`);
}

getDriverPendingOrders(driverId: number): Observable<any> {
  return this.http.get(`${this.apiUrl}/orders/admin/settlements/driver/${driverId}/`);
}

recordRemittance(data: RecordRemittancePayload): Observable<any> {
  return this.http.post(`${this.apiUrl}/orders/admin/settlements/record/`, data);
}


// ── EXPENSES ──────────────────────────────────────
getExpenseCategories(): Observable<ExpenseCategoryModel[]> {
  return this.http.get<ExpenseCategoryModel[]>(`${this.apiUrl}/expenses/categories/`);
}
 
addExpenseCategory(data: Partial<ExpenseCategoryModel>): Observable<any> {
  return this.http.post(`${this.apiUrl}/expenses/categories/`, data);
}
 
updateExpenseCategory(id: number, data: Partial<ExpenseCategoryModel>): Observable<any> {
  return this.http.put(`${this.apiUrl}/expenses/categories/${id}/`, data);
}
 
deleteExpenseCategory(id: number): Observable<any> {
  return this.http.delete(`${this.apiUrl}/expenses/categories/${id}/`);
}
 
getExpenses(params?: { category_id?: number; payment_method?: string; start_date?: string; end_date?: string }): Observable<ExpenseModel[]> {
  let query = '';
  if (params) {
    const parts = Object.entries(params)
      .filter(([_, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
    if (parts.length) query = '?' + parts.join('&');
  }
  return this.http.get<ExpenseModel[]>(`${this.apiUrl}/expenses/records/${query}`);
}
 
addExpense(data: Partial<ExpenseModel>): Observable<any> {
  return this.http.post(`${this.apiUrl}/expenses/records/`, data);
}
 
updateExpense(id: number, data: Partial<ExpenseModel>): Observable<any> {
  return this.http.put(`${this.apiUrl}/expenses/records/${id}/`, data);
}
 
deleteExpense(id: number): Observable<any> {
  return this.http.delete(`${this.apiUrl}/expenses/records/${id}/`);
}
 
getExpenseSummary(params?: { start_date?: string; end_date?: string }): Observable<ExpenseSummaryModel> {
  let query = '';
  if (params) {
    const parts = Object.entries(params)
      .filter(([_, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
    if (parts.length) query = '?' + parts.join('&');
  }
  return this.http.get<ExpenseSummaryModel>(`${this.apiUrl}/expenses/records/summary/${query}`);
}
 
// ── STORE TIMING ──────────────────────────────────
getStoreStatus(): Observable<StoreStatusModel> {
  return this.http.get<StoreStatusModel>(`${this.apiUrl}/store/status/`);
}
 
getStoreSchedule(): Observable<StoreScheduleModel> {
  return this.http.get<StoreScheduleModel>(`${this.apiUrl}/store/schedule/`);
}
 
updateStoreSchedule(data: Partial<StoreScheduleModel>): Observable<any> {
  return this.http.patch(`${this.apiUrl}/store/schedule/`, data);
}

getStockAdjustments(batchId?: number): Observable<StockAdjustmentModel[]> {
  const query = batchId ? `?batch=${batchId}` : '';
  return this.http.get<StockAdjustmentModel[]>(`${this.apiUrl}/stock/adjustments/${query}`);
}

addStockAdjustment(data: Partial<StockAdjustmentModel>): Observable<any> {
  return this.http.post(`${this.apiUrl}/stock/adjustments/`, data);
}
 

}