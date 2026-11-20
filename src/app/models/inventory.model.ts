export interface InventoryModel {
  product?: number;
  product_id?: number;
  product_name: string;
  total_stock: number;
  reserved_stock?: number;
  available_stock: number;
  unit: string | null;
}