export interface OrderItem {
  id: number;
  product: number;
  product_name: string;
  subcategory?: number;
  subcategory_id?: number;
  subcategory_name?: string | null;
  quantity: number;
  price: number;
  total_price: number;
  batch_no: string;
}

export interface OrderModel {
  id: number;
  total_amount: string;      // ✅ matches API
  discount_amount: string;   // ✅ matches API
  item_total?: string;
  delivery_fee?: string;
  packaging_charge?: string;
  gst?: string;
  coupon_code?: string;
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: string;
  payment_status: string;
  order_status: string;
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