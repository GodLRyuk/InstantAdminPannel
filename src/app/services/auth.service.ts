import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { BrandModel } from '../models/brand.model';
import { UnitModel } from '../models/unit.model';
import { CategoryModel } from '../models/category.model';
import { SubCategoryModel } from '../models/sub-category.model';
import { ProductModel } from '../models/products.model';
import { Bundle, BundlePayload, toBundleFormData } from '../models/bundle.model';
import { StockModel } from '../models/stock.model';
import { OrderModel } from '../models/order.model';
import { BannerModel } from '../models/banner.model';
import { advBannerModel } from '../models/advbanner.model';
import { RecordRemittancePayload } from '../models/settlements.model';
import { ExpenseCategoryModel, ExpenseModel, ExpenseSummaryModel } from '../models/expense.model';
import { StoreScheduleModel, StoreStatusModel } from '../models/store-schedule.model';
import { StockAdjustmentModel } from '../models/stock-adjustment.model';
import { AdminUser, CreateUserPayload, UserRole } from '../models/user.model';
import { Login, LoginResponse } from '../models/login.model';
import {
  Coupon,
  CouponPayload,
  CouponValidationRequest,
  FlashSale,
  FlashSalePayload,
} from '../models/promotion.model';
import {
  AnalyticsAssistantRequest,
  AnalyticsAssistantResponse,
  AnalyticsDemandForecast,
  AnalyticsDemandSignal,
  AnalyticsInventoryInsights,
  AnalyticsOverview,
  AnalyticsSalesSummary,
  AnalyticsTopProducts,
} from '../models/analytics.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = `${environment.apiUrl}/accounts/admin-login/`;

  constructor(private http: HttpClient) { }

  login(data: Login): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.apiUrl, data);
  }

  saveSession(response: LoginResponse): void {
    localStorage.setItem('token', response.access);
    localStorage.setItem('refresh', response.refresh);
    if (response.role) {
      localStorage.setItem('role', response.role.toUpperCase());
    }
    localStorage.setItem('is_restaurant', String(response.is_restaurant === true));
    localStorage.setItem('is_staff', String(response.is_staff === true));
    if (response.username) {
      localStorage.setItem('username', response.username);
    }
    if (response.user_id !== undefined) {
      localStorage.setItem('user_id', String(response.user_id));
    }
  }

  isAuthenticated(): boolean {
    return Boolean(localStorage.getItem('token'));
  }

  isRestaurant(): boolean {
    return localStorage.getItem('is_restaurant') === 'true'
      || localStorage.getItem('role') === 'RESTAURANT';
  }

  isStaff(): boolean {
    return localStorage.getItem('is_staff') === 'true'
      || localStorage.getItem('role') === 'ADMIN';
  }

  getUserId(): string | null {
    const storedId = localStorage.getItem('user_id');
    if (storedId) {
      return storedId;
    }

    const token = localStorage.getItem('token');
    const payload = token?.split('.')[1];
    if (!payload) {
      return null;
    }

    try {
      const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '='));
      const claims: unknown = JSON.parse(decoded);
      if (claims && typeof claims === 'object' && 'user_id' in claims) {
        const userId = claims.user_id;
        if ((typeof userId === 'string' && userId.length > 0) || (typeof userId === 'number' && Number.isFinite(userId))) {
          return String(userId);
        }
      }
    } catch (error) {
      console.error('Unable to read the user ID from the access token.', error);
    }

    return null;
  }

  get accountLabel(): string {
    return this.isRestaurant() ? 'Restaurant Owner' : 'Admin';
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
    localStorage.removeItem('user_id');
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

  createStoreOrder(data: { items: Array<{ product: number; quantity: number }>; payment_method: 'CASH'; discount?: number }): Observable<unknown> {
    return this.http.post<unknown>(`${this.apiUrl}/orders/store/create/`, data);
  }

  getUsers(role?: UserRole): Observable<AdminUser[] | { results: AdminUser[] }> {
    const params = role ? new HttpParams().set('role', role) : new HttpParams();
    return this.http.get<AdminUser[] | { results: AdminUser[] }>(
      `${this.apiUrl}/accounts/users/`,
      { params }
    );
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/accounts/users/${id}/`);
  }

  createUser(data: CreateUserPayload): Observable<AdminUser> {
    return this.http.post<AdminUser>(`${this.apiUrl}/accounts/register/`, data);
  }

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

  validateCoupon(data: CouponValidationRequest): Observable<unknown> {
    return this.http.post<unknown>(`${this.apiUrl}/promotions/validate-coupon/`, data);
  }

  getCoupons(): Observable<Coupon[] | { results: Coupon[] }> {
    return this.http.get<Coupon[] | { results: Coupon[] }>(
      `${this.apiUrl}/promotions/admin/coupons/`
    );
  }

  createCoupon(data: CouponPayload): Observable<Coupon> {
    return this.http.post<Coupon>(`${this.apiUrl}/promotions/admin/coupons/`, data);
  }

  updateCoupon(id: number, data: CouponPayload): Observable<Coupon> {
    return this.http.patch<Coupon>(`${this.apiUrl}/promotions/admin/coupons/${id}/`, data);
  }

  deleteCoupon(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/promotions/admin/coupons/${id}/`);
  }

  getFlashSales(): Observable<FlashSale[] | { results: FlashSale[] }> {
    return this.http.get<FlashSale[] | { results: FlashSale[] }>(
      `${this.apiUrl}/products/admin/flash-sales/`
    );
  }

  createFlashSale(data: FlashSalePayload): Observable<FlashSale> {
    return this.http.post<FlashSale>(`${this.apiUrl}/products/admin/flash-sales/`, data);
  }

  updateFlashSale(id: number, data: FlashSalePayload): Observable<FlashSale> {
    return this.http.patch<FlashSale>(`${this.apiUrl}/products/admin/flash-sales/${id}/`, data);
  }

  deleteFlashSale(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/products/admin/flash-sales/${id}/`);
  }

  getBundles(): Observable<Bundle[] | { results: Bundle[] }> {
    return this.http.get<Bundle[] | { results: Bundle[] }>(
      `${this.apiUrl}/products/admin/bundles/`
    );
  }

  createBundle(data: BundlePayload): Observable<Bundle> {
    return this.http.post<Bundle>(
      `${this.apiUrl}/products/admin/bundles/`,
      toBundleFormData(data)
    );
  }

  updateBundle(id: number, data: BundlePayload): Observable<Bundle> {
    return this.http.patch<Bundle>(
      `${this.apiUrl}/products/admin/bundles/${id}/`,
      toBundleFormData(data)
    );
  }

  replaceBundle(id: number, data: BundlePayload): Observable<Bundle> {
    return this.http.put<Bundle>(
      `${this.apiUrl}/products/admin/bundles/${id}/`,
      toBundleFormData(data)
    );
  }

  deleteBundle(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/products/admin/bundles/${id}/`);
  }

  addProduct(data: FormData): Observable<ProductModel | ProductModel[]> {

    return this.http.post<ProductModel | ProductModel[]>(
      `${this.apiUrl}/products/`, data
    );
  }
  generateBarcode(productId: number): Observable<{ barcode: string }> {
    return this.http.post<{ barcode: string }>(
      `${this.apiUrl}/products/generate-barcode/`, { product_id: productId }
    );
  }
  updateProduct(id: number, data: FormData): Observable<ProductModel | ProductModel[]> {
  return this.http.put<ProductModel | ProductModel[]>(
    `${this.apiUrl}/products/${id}/`, data
  );
}
  deleteproduct(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/products/${id}/`);
  }


  getAllstock(includeEmpty = false): Observable<StockModel[]> {
    const params = includeEmpty
      ? new HttpParams().set('include_empty', 'true')
      : new HttpParams();

    return this.http.get<StockModel[]>(`${this.apiUrl}/stock/`, { params });
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

  getStoreSales(): Observable<OrderModel[] | { results: OrderModel[] }> {
    return this.http.get<OrderModel[] | { results: OrderModel[] }>(
      `${this.apiUrl}/store/sales/`,
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
    return this.http.get<{
      period: string;
      revenue: number | string;
      order_count?: number;
      transaction_count?: number;
      online_revenue?: number | string;
      store_revenue?: number | string;
      online_count?: number;
      store_count?: number;
      online_order_count?: number;
      store_sale_count?: number;
    }[]>(
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

  getAnalyticsOverview(startDate: string, endDate: string) {
    const params = new HttpParams()
      .set('start_date', startDate)
      .set('end_date', endDate);
    return this.http.get<AnalyticsOverview>(`${this.apiUrl}/analytics/overview/`, { params });
  }

  getAnalyticsSalesSummary(
    startDate: string,
    endDate: string,
    groupBy: 'day' | 'week' | 'month'
  ) {
    const params = new HttpParams()
      .set('start_date', startDate)
      .set('end_date', endDate)
      .set('group_by', groupBy);
    return this.http.get<AnalyticsSalesSummary>(`${this.apiUrl}/analytics/sales-summary/`, { params });
  }

  getAnalyticsTopProducts(startDate: string, endDate: string) {
    const params = new HttpParams()
      .set('start_date', startDate)
      .set('end_date', endDate)
      .set('limit', 10)
      .set('sort_by', 'revenue');
    return this.http.get<AnalyticsTopProducts>(`${this.apiUrl}/analytics/top-products/`, { params });
  }

  getAnalyticsDemandForecast(horizonDays: number) {
    const params = new HttpParams()
      .set('horizon_days', horizonDays)
      .set('limit', 100);
    return this.http.get<AnalyticsDemandForecast>(`${this.apiUrl}/analytics/demand-forecast/`, { params });
  }

  getAnalyticsInventoryInsights() {
    const params = new HttpParams().set('limit', 100);
    return this.http.get<AnalyticsInventoryInsights>(`${this.apiUrl}/analytics/inventory-insights/`, { params });
  }

  getAnalyticsDemandSignals() {
    return this.http.get<AnalyticsDemandSignal[]>(`${this.apiUrl}/analytics/demand-signals/`);
  }

  askAnalyticsAssistant(request: AnalyticsAssistantRequest) {
    return this.http.post<AnalyticsAssistantResponse>(
      `${this.apiUrl}/analytics/assistant/ask/`,
      request
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
