export interface DriverSettlementSummary {
  deliveryassignment__driver__id: number;
  deliveryassignment__driver__username: string;
  order_count: number;
  total_due: number;
}

export interface PendingCashOrder {
  order_id: number;
  total_amount: number;
  customer_name: string;
  delivered_at: string;
}

export interface RecordRemittancePayload {
  driver_id: number;
  order_ids?: number[];
  amount_received: number;
  notes?: string;
}