export interface StockModel {
  id: number;
  product_id: number;
  product__name: string;
  batch_no: string;
  quantity: number;
  purchase_price: number;
  selling_price: number;
}