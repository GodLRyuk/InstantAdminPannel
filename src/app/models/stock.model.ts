export interface StockModel {
  id: number;
  product: number;        // ← API returns 'product' not 'product_id'
  product_id: number;
  product_name: string;
  batch_no: string;
  quantity: number;       // ← change total_stock to quantity
  total_stock: number;
  purchase_price: number;
  selling_price: number;
  available_stock: number;
}