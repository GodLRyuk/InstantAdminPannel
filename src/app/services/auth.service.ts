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

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = `${environment.apiUrl}/accounts/admin-login/`;

  constructor(private http: HttpClient) {}

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

  getAllunits(): Observable<UnitModel[]>{
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
  const token = localStorage.getItem('token');

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
  getAllCatforSub(): Observable<any>{
   const token = localStorage.getItem('token');

  return this.http.get<SubCategoryModel[]>(
    `${this.apiUrl}/masters/subcategories/`,
  );
  }
  getAllSubCat(): Observable<any>{
   const token = localStorage.getItem('token');

  return this.http.get<SubCategoryModel[]>(
    `${this.apiUrl}/masters/subcategories/`,
  );
  }
  addSubCat(data: Partial<SubCategoryModel>): Observable<any>{
    const token = localStorage.getItem('token');

  return this.http.post<SubCategoryModel[]>(
    `${this.apiUrl}/masters/subcategories/`, data
  );
  }
  updateSubCat(id:number, data: Partial<SubCategoryModel>): Observable<any>
  {
    const token = localStorage.getItem('token');
    return this.http.put(`${this.apiUrl}/masters/subcategories/${id}/`, data);
  }
  deleteSubCat(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/masters/subcategories/${id}/`);
  }



  getAllProducts(): Observable<any>{
   const token = localStorage.getItem('token');

  return this.http.get<SubCategoryModel[]>(
    `${this.apiUrl}/products/`,
  );
  }
  addProduct(data: Partial<SubCategoryModel>): Observable<any>{
    const token = localStorage.getItem('token');

  return this.http.post<SubCategoryModel[]>(
    `${this.apiUrl}/products/`, data
  );
  }
  deleteproduct(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/products/${id}/`);
  }


  getAllstock(): Observable<any>{
   const token = localStorage.getItem('token');

  return this.http.get<StockModel[]>(
    `${this.apiUrl}/stocks/`,
  );
  }
  addStock(data: Partial<StockModel>): Observable<any>{
    const token = localStorage.getItem('token');

  return this.http.post<StockModel[]>(
    `${this.apiUrl}/stocks/`, data
  );
  }
  deleteStock(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/stocks/${id}/`);
  }
}