export interface InventoryModel {
  product_id: number;
  product_name: string;
  total_stock: number;
  available_stock: number;
  unit: string | null;
}