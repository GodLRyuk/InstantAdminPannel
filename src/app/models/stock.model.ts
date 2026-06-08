export interface StockModel {
  id: number;
  product_id: number;
  product_name: string;
  batch_no: string;
  total_stock: number;
  purchase_price: number;
  selling_price: number;
  available_stock: number;
}