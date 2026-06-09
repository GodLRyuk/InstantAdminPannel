export interface OrderItem {
  id: number;
  product: number;
  product_name: string;
  quantity: number;
  price: number;
  total_price: number;
}

export interface OrderModel {
  id: number;
  total_amount: string;      // ✅ matches API
  discount_amount: string;   // ✅ matches API
  coupon_code?: string;
  payment_status: string;
  order_status: string;
  batch_no: string;
  created_at: string;
  items: OrderItem[];
}
export interface CreateOrderItem {
  product: number;   // product ID
  quantity: number;
}

export interface CreateOrderModel {
  items: CreateOrderItem[];
  coupon_code?: string;
}