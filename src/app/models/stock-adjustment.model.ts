export interface StockAdjustmentModel {
  id?: number;
  batch: number;
  batch_no?: string;
  product_name?: string;
  adjust_type: 'IN' | 'OUT';
  reason: 'DAMAGE' | 'RETURN_TO_DEALER' | 'EXPIRED' | 'LOST' | 'CORRECTION' | 'OTHER';
  quantity: number;
  notes?: string;
  adjusted_by?: number;
  adjusted_by_name?: string;
  created_at?: string;
}