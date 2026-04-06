import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
    return this.http.post<any>(`${environment.apiUrl}/accounts/token/refresh/`, {
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
  addCat(data: Partial<CategoryModel>): Observable<any> {
    return this.http.post(`${this.apiUrl}/masters/categories/`, data);
  }

  updateCat(id: number, data: Partial<CategoryModel>): Observable<any> {
    return this.http.put(`${this.apiUrl}/masters/categories/${id}/`, data);
  }

  deleteCat(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/masters/categories/${id}/`);
  }
  getAllCatforSub(): Observable<any> {

    return this.http.get<SubCategoryModel[]>(
      `${this.apiUrl}/masters/subcategories/`,
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
getOrders():  Observable<any> {
    return this.http.get<OrderModel[]>(
      `${this.apiUrl}/orders/`,
    );
  }

updateOrderStatus(id: number, data: { status: string }): Observable<any> {
  return this.http.post(`${this.apiUrl}/orders/${id}/status/`, data);
}

addBanner(data: Partial<BannerModel>, imageFile?: File): Observable<any> {
    const formData = new FormData();
    formData.append('is_active', data.is_active ? 'true' : 'false');

    if (imageFile) formData.append('image', imageFile);

    return this.http.post(`${this.apiUrl}/masters/banners/`, formData);
  }

  // Update existing banner (with optional image)
  updateBanner(id: number, data: Partial<BannerModel>, imageFile?: File): Observable<any> {
    const formData = new FormData();
    if (data.is_active !== undefined) formData.append('is_active', data.is_active ? 'true' : 'false');

    if (imageFile) formData.append('image', imageFile);

    return this.http.put(`${this.apiUrl}/masters/banners/${id}/`, formData);
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
}