export interface ProductModel {
  id: number;
  name: string;
  price: string; // keep string if coming as "80.00"
  discount_percent: string;
  description: string;
  image: string | null;
  is_active: boolean;
  created_at: string;
  category: number;
  subcategory: number;
  subcategory_id?: number;
  brand: number | null;
  unit: number;
  unit_size: null,
  barcode?: string | null;
}