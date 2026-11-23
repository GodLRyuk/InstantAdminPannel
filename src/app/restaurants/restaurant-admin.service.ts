import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { LOCAL_API_ERROR } from '../services/http-context';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';
import {
  AddonGroup,
  AddonGroupPayload,
  AddonOption,
  AddonOptionPayload,
  AdminRestaurant,
  CommissionInput,
  CommissionRecord,
  PaymentSplitRecord,
  RestaurantRefundRecord,
  RestaurantVendor,
  VendorOnboardingPayload,
  Cuisine,
  CustomerMenuItem,
  MenuCategory,
  MenuItemPayload,
  PartnerMenuItem,
  RestaurantOrder,
  RestaurantPlacedOrder,
  RestaurantPlaceOrderRequest,
  RestaurantQuote,
  RestaurantQuoteRequest,
} from './restaurant.models';

export interface PaymentOperationResult {
  failed: number;
  processed?: number;
  synced?: number;
}

/**
 * Calls the Django restaurants API. The JWT header is added by your existing
 * HTTP interceptor, the same way as your other services.
 */
@Injectable({ providedIn: 'root' })
export class RestaurantAdminService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = `${environment.apiUrl}/restaurants`;

  vendors(): Observable<RestaurantVendor[]> {
    if (!this.canManagePayments()) return throwError(() => new Error('Staff access is required.'));
    return this.http.get<RestaurantVendor[]>(`${this.base}/admin/vendors/`, { context: new HttpContext().set(LOCAL_API_ERROR, true) });
  }

  onboardVendor(payload: VendorOnboardingPayload): Observable<RestaurantVendor> {
    if (!this.canManagePayments()) return throwError(() => new Error('Staff access is required.'));
    return this.http.post<RestaurantVendor>(`${this.base}/admin/vendors/`, payload, { context: new HttpContext().set(LOCAL_API_ERROR, true) });
  }

  commissions(): Observable<CommissionRecord[]> {
    return this.paymentRecords<CommissionRecord[]>('commissions');
  }

  addCommission(payload: CommissionInput): Observable<CommissionRecord> {
    return this.paymentRecords<CommissionRecord>('commissions', payload);
  }

  paymentSplits(): Observable<PaymentSplitRecord[]> {
    return this.paymentRecords<PaymentSplitRecord[]>('payment-splits');
  }

  submitSplit(orderNumber: string): Observable<PaymentSplitRecord> {
    return this.paymentRecords<PaymentSplitRecord>('payment-splits', { order_number: orderNumber });
  }

  refunds(): Observable<RestaurantRefundRecord[]> {
    return this.paymentRecords<RestaurantRefundRecord[]>('refunds');
  }

  submitRefund(orderNumber: string): Observable<RestaurantRefundRecord> {
    return this.paymentRecords<RestaurantRefundRecord>('refunds', { order_number: orderNumber });
  }

  private paymentRecords<T>(
    path: 'commissions' | 'payment-splits' | 'refunds',
    payload?: CommissionInput | { order_number: string },
  ): Observable<T> {
    if (!this.canManagePayments()) return throwError(() => new Error('Staff access is required.'));
    const url = `${this.base}/admin/${path}/`;
    const options = { context: new HttpContext().set(LOCAL_API_ERROR, true) };
    return payload ? this.http.post<T>(url, payload, options) : this.http.get<T>(url, options);
  }

  private canManagePayments(): boolean {
    return this.auth.isAuthenticated() && this.auth.isStaff() && !this.auth.isRestaurant();
  }

  processPayments(action: 'splits' | 'sync' | 'refunds'): Observable<PaymentOperationResult> {
    if (!this.canManagePayments()) {
      return throwError(() => new Error('Staff access is required.'));
    }
    const paths = {
      splits: 'payment-splits/process',
      sync: 'payment-splits/sync',
      refunds: 'refunds/process',
    };
    return this.http.post<PaymentOperationResult>(`${this.base}/admin/${paths[action]}/`, {});
  }

  // ---------------- restaurants
  list(filters: { status?: string; q?: string } = {}): Observable<AdminRestaurant[]> {
    let params = new HttpParams();
    if (filters.status) params = params.set('status', filters.status);
    if (filters.q) params = params.set('q', filters.q);
    return this.http.get<AdminRestaurant[]>(`${this.base}/admin/restaurants/`, { params });
  }

  ownerRestaurants(): Observable<AdminRestaurant[]> {
    return this.http.get<AdminRestaurant[]>(`${this.base}/`);
  }

  get(id: number): Observable<AdminRestaurant> {
    return this.http.get<AdminRestaurant>(`${this.base}/admin/restaurants/${id}/`);
  }

  getOwnerRestaurant(id: number): Observable<AdminRestaurant> {
    return this.http.get<AdminRestaurant>(`${this.base}/${id}/`);
  }

  create(data: Record<string, unknown>): Observable<AdminRestaurant> {
    return this.http.post<AdminRestaurant>(`${this.base}/admin/restaurants/`, data);
  }

  update(id: number, data: Record<string, unknown>): Observable<AdminRestaurant> {
    return this.http.patch<AdminRestaurant>(`${this.base}/admin/restaurants/${id}/`, data);
  }

  updateOwnerRestaurant(id: number, data: Record<string, unknown> | FormData): Observable<AdminRestaurant> {
    return this.http.patch<AdminRestaurant>(`${this.base}/${id}/`, data);
  }

  /** Logo and cover are sent separately as multipart. */
  uploadImages(id: number, files: { logo?: File | null; cover_image?: File | null }): Observable<AdminRestaurant> {
    const fd = new FormData();
    if (files.logo) fd.append('logo', files.logo);
    if (files.cover_image) fd.append('cover_image', files.cover_image);
    return this.http.patch<AdminRestaurant>(`${this.base}/admin/restaurants/${id}/`, fd);
  }

  approve(id: number): Observable<AdminRestaurant> {
    return this.http.post<AdminRestaurant>(`${this.base}/admin/restaurants/${id}/approve/`, {});
  }

  reject(id: number, reason: string): Observable<AdminRestaurant> {
    return this.http.post<AdminRestaurant>(`${this.base}/admin/restaurants/${id}/reject/`, { reason });
  }

  suspend(id: number, reason: string): Observable<AdminRestaurant> {
    return this.http.post<AdminRestaurant>(`${this.base}/admin/restaurants/${id}/suspend/`, { reason });
  }

  cuisines(): Observable<Cuisine[]> {
    return this.http.get<Cuisine[]>(`${this.base}/admin/cuisines/`);
  }

  createCuisine(name: string): Observable<Cuisine> {
    return this.http.post<Cuisine>(`${this.base}/admin/cuisines/`, { name });
  }

  menuCategories(restaurantId: number): Observable<MenuCategory[]> {
    const params = new HttpParams().set('restaurant', restaurantId);
    return this.http.get<MenuCategory[]>(`${this.base}/admin/menu-categories/`, { params });
  }

  createMenuCategory(data: Pick<MenuCategory, 'restaurant' | 'name' | 'sort_order'>): Observable<MenuCategory> {
    return this.http.post<MenuCategory>(`${this.base}/admin/menu-categories/`, data);
  }

  partnerCategories(): Observable<MenuCategory[] | { results: MenuCategory[] }> {
    return this.http.get<MenuCategory[] | { results: MenuCategory[] }>(`${this.base}/partner/categories/`);
  }

  bulkUploadMenu(resource: 'categories' | 'items', file: File): Observable<unknown> {
    const data = new FormData();
    data.append('file', file);
    return this.http.post(`${this.base}/partner/${resource}/bulk/`, data, {
      context: new HttpContext().set(LOCAL_API_ERROR, true),
    });
  }

  createPartnerCategory(data: Pick<MenuCategory, 'name' | 'sort_order'>): Observable<MenuCategory> {
    return this.http.post<MenuCategory>(`${this.base}/partner/categories/`, data);
  }

  updatePartnerCategory(id: number, data: Partial<Pick<MenuCategory, 'name' | 'sort_order'>>): Observable<MenuCategory> {
    return this.http.patch<MenuCategory>(`${this.base}/partner/categories/${id}/`, data);
  }

  deletePartnerCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/partner/categories/${id}/`);
  }

  menuItems(): Observable<PartnerMenuItem[] | { results: PartnerMenuItem[] }> {
    return this.http.get<PartnerMenuItem[] | { results: PartnerMenuItem[] }>(`${this.base}/partner/items/`);
  }

  salesReport(filters: { start_date: string; end_date: string; product_id: string }): Observable<unknown> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) params = params.set(key, value);
    }
    return this.http.get<unknown>(`${this.base}/partner/reports/sales/`, {
      params,
      ...this.localErrors(),
    });
  }

  menuItem(id: number): Observable<PartnerMenuItem> {
    return this.http.get<PartnerMenuItem>(`${this.base}/partner/items/${id}/`);
  }

  createMenuItem(data: MenuItemPayload | FormData): Observable<PartnerMenuItem> {
    return this.http.post<PartnerMenuItem>(`${this.base}/partner/items/`, data);
  }

  updateMenuItem(id: number, data: Partial<MenuItemPayload> | FormData): Observable<PartnerMenuItem> {
    return this.http.patch<PartnerMenuItem>(`${this.base}/partner/items/${id}/`, data);
  }

  deleteMenuItem(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/partner/items/${id}/`);
  }

  addonGroups(itemId: number): Observable<AddonGroup[] | { results: AddonGroup[] }> {
    return this.http.get<AddonGroup[] | { results: AddonGroup[] }>(
      this.addonGroupsUrl(itemId), this.localErrors(),
    );
  }

  saveAddonGroup(itemId: number, payload: AddonGroupPayload, groupId: number | null): Observable<AddonGroup> {
    const url = this.addonGroupsUrl(itemId);
    return groupId === null
      ? this.http.post<AddonGroup>(url, payload, this.localErrors())
      : this.http.patch<AddonGroup>(`${url}${groupId}/`, payload, this.localErrors());
  }

  deleteAddonGroup(itemId: number, groupId: number): Observable<void> {
    return this.http.delete<void>(`${this.addonGroupsUrl(itemId)}${groupId}/`, this.localErrors());
  }

  addonOptions(itemId: number, groupId: number): Observable<AddonOption[] | { results: AddonOption[] }> {
    return this.http.get<AddonOption[] | { results: AddonOption[] }>(
      this.addonOptionsUrl(itemId, groupId), this.localErrors(),
    );
  }

  saveAddonOption(
    itemId: number, groupId: number, payload: AddonOptionPayload, optionId: number | null,
  ): Observable<AddonOption> {
    const url = this.addonOptionsUrl(itemId, groupId);
    return optionId === null
      ? this.http.post<AddonOption>(url, payload, this.localErrors())
      : this.http.patch<AddonOption>(`${url}${optionId}/`, payload, this.localErrors());
  }

  deleteAddonOption(itemId: number, groupId: number, optionId: number): Observable<void> {
    return this.http.delete<void>(`${this.addonOptionsUrl(itemId, groupId)}${optionId}/`, this.localErrors());
  }

  private addonGroupsUrl(itemId: number): string {
    return `${this.base}/partner/items/${itemId}/addon-groups/`;
  }

  private addonOptionsUrl(itemId: number, groupId: number): string {
    return `${this.addonGroupsUrl(itemId)}${groupId}/options/`;
  }

  private localErrors(): { context: HttpContext } {
    return { context: new HttpContext().set(LOCAL_API_ERROR, true) };
  }

  customerMenu(restaurantId: number): Observable<CustomerMenuItem[]> {
    return this.http.get<CustomerMenuItem[]>(`${this.base}/${restaurantId}/menu/`);
  }

  quoteOrder(payload: RestaurantQuoteRequest): Observable<RestaurantQuote> {
    return this.http.post<RestaurantQuote>(`${this.base}/orders/quote/`, payload);
  }

  placeOrder(payload: RestaurantPlaceOrderRequest): Observable<RestaurantPlacedOrder> {
    return this.http.post<RestaurantPlacedOrder>(`${this.base}/orders/`, payload);
  }

  // ---------------- orders
  orders(filters: { status?: string; restaurant?: number | null; active?: boolean } = {}): Observable<RestaurantOrder[]> {
    let params = new HttpParams();
    if (filters.status) params = params.set('status', filters.status);
    if (filters.restaurant) params = params.set('restaurant', filters.restaurant);
    if (filters.active !== undefined) params = params.set('active', filters.active ? '1' : '0');
    return this.http.get<RestaurantOrder[]>(`${this.base}/admin/orders/`, { params });
  }

  partnerOrders(filters: { status?: string; active?: boolean } = {}): Observable<RestaurantOrder[]> {
    let params = new HttpParams();
    if (filters.status) params = params.set('status', filters.status);
    if (filters.active !== undefined) params = params.set('active', filters.active ? '1' : '0');
    return this.http.get<RestaurantOrder[]>(`${this.base}/partner/orders/`, { params });
  }

  partnerOrder(id: number): Observable<RestaurantOrder> {
    return this.http.get<RestaurantOrder>(`${this.base}/partner/orders/${id}/`);
  }

  setPartnerOrderStatus(id: number, status: string, reason?: string): Observable<RestaurantOrder> {
    const body: { status: string; reason?: string } = { status };
    if (reason) body.reason = reason;
    return this.http.post<RestaurantOrder>(`${this.base}/partner/orders/${id}/status/`, body);
  }

  setOrderStatus(id: number, status: string, reason = ''): Observable<RestaurantOrder> {
    return this.http.post<RestaurantOrder>(`${this.base}/admin/orders/${id}/status/`, { status, reason });
  }
}
