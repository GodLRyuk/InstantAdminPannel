export interface InventoryModel {
  product_id: number;
  product_name: string;
  quantity: number;
  available_stock: number;
  unit: string | null;
}