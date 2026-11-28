export interface ProductModel {
  id: number;
  name: string;
  price: string; // keep string if coming as "80.00"
  discount_percent: string;
  is_combo?: boolean;
  combo_buy_qty?: number | null;
  combo_free_qty?: number | null;
  combo_price?: string | null;
  combo_repeat?: boolean;
  description: string;
  image: string | null;
  is_active: boolean;
  created_at: string;
  category: number;
  subcategory: number;
  subcategory_id?: number;
  brand: number | null;
  unit: number;
  unit_size: number | string | null;
  barcode?: string | null;
  stock?: number | string | null;
  category_name?: string | null;
  subcategory_name?: string | null;
  brand_name?: string | null;
  unit_name?: string | null;
}
