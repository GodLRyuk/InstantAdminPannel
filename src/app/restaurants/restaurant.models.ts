export type RestaurantStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface Cuisine {
  id: number;
  name: string;
}

export interface MenuCategory {
  id: number;
  restaurant?: number;
  restaurant_name?: string;
  name: string;
  sort_order: number;
}

export interface PartnerMenuItem {
  id: number;
  name: string;
  description: string;
  category: number | MenuCategory | null;
  category_name?: string | null;
  is_veg: boolean;
  price: string;
  mrp: string;
  is_available: boolean;
  packaging_charge: string;
  sort_order: number;
  image?: string | null;
  photo?: string | null;
}

export interface MenuItemPayload {
  name: string;
  description: string;
  category: number | null;
  is_veg: boolean;
  price: string;
  mrp: string;
  is_available: boolean;
  packaging_charge: string;
  sort_order: number;
}

export interface AdminRestaurant {
  id: number;
  owner: number;
  owner_name: string;
  name: string;
  description: string;
  cuisines: number[];
  phone: string;
  email: string;
  address_line: string;
  city: string;
  pincode: string;
  latitude: string | null;
  longitude: string | null;
  fssai_number: string;
  logo: string | null;
  cover_image: string | null;
  opens_at: string;
  closes_at: string;
  is_accepting_orders: boolean;
  is_open_now: boolean;
  avg_prep_minutes: number;
  delivery_fee: string;
  delivery_radius_km: string;
  min_order_amount: string;
  offer_percent: number | null;
  offer_max_discount: number;
  offer_min_order: string;
  offer_code: string;
  rating: string;
  rating_count: number;
  status: RestaurantStatus;
  rejection_reason: string;
  created_at: string;
  updated_at: string;
}

export type OrderStatus =
  | 'awaiting_payment'
  | 'placed'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'rejected'
  | 'cancelled';

export interface RestaurantOrderItem {
  id: number;
  name: string;
  is_veg: boolean;
  unit_price: string;
  quantity: number;
  line_total: string;
}

export interface RestaurantOrder {
  id: number;
  order_number: string;
  status: OrderStatus;
  status_label: string;
  payment_method: 'online' | 'cod';
  payment_method_label: string;
  payment_status: string;
  payment_status_label: string;
  restaurant: { id: number; name: string; phone: string; image: string | null };
  items: RestaurantOrderItem[];
  item_total: string;
  discount: string;
  delivery_fee: string;
  packaging_charge: string;
  gst: string;
  total_amount: string;
  offer_code: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: Record<string, unknown>;
  notes: string;
  rejection_reason: string;
  created_at: string;
  updated_at: string;
}

/** Steps the Instant team can take. Cancel is added separately for non-final orders. */
export const NEXT_STATUSES: Record<string, OrderStatus[]> = {
  placed: ['accepted', 'rejected'],
  accepted: ['preparing'],
  preparing: ['ready'],
  ready: ['out_for_delivery'],
  out_for_delivery: ['delivered'],
};

export const OWNER_NEXT_STATUSES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  placed: ['accepted', 'rejected'],
  accepted: ['preparing'],
  preparing: ['ready'],
};

export const FINAL_STATUSES: OrderStatus[] = ['delivered', 'rejected', 'cancelled'];

export const STATUS_BUTTON_LABEL: Record<string, string> = {
  accepted: 'Accept',
  rejected: 'Reject',
  preparing: 'Start preparing',
  ready: 'Mark ready',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancel order',
};

export interface RestaurantVendor {
  id: number;
  restaurant_id: number;
  restaurant_name: string;
  cashfree_vendor_id: string;
  verification_status: string;
  settlement_status: string;
  bank_account_last4: string;
  ifsc_code: string;
  updated_at: string;
}

export interface VendorOnboardingPayload {
  restaurant_id: number;
  account_number: string;
  ifsc_code: string;
  account_holder_name: string;
  pan: string;
  business_type: string;
  gstin?: string;
}

export interface CommissionInput {
  restaurant: number;
  commission_percentage: number;
  effective_from: string;
}

export interface CommissionRecord extends Omit<CommissionInput, 'commission_percentage'> {
  id: number;
  restaurant_name: string;
  commission_percentage: string;
}

export interface CashfreeOrderRecord {
  id: number;
  order_number: string;
  restaurant_name: string;
  status: string;
  provider_reference: string;
  cashfree_error?: boolean;
}

export interface PaymentSplitRecord extends CashfreeOrderRecord {
  gross_amount: string;
  commission_percentage: string;
  platform_commission: string;
  vendor_amount: string;
}

export interface RestaurantRefundRecord extends CashfreeOrderRecord {
  amount: string;
}
