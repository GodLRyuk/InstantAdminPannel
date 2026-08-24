export interface ExpenseCategoryModel {
  id: number;
  name: string;
  is_active: boolean;
  created_at?: string;
}

export interface ExpenseModel {
  id: number;
  category: number;
  category_name?: string;
  title: string;
  amount: number;
  payment_method: 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CARD' | 'OTHER';
  reference_no?: string;
  expense_date: string;      // YYYY-MM-DD
  remarks?: string;
  receipt?: string;          // URL, read-only from backend
  added_by?: number;
  added_by_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExpenseSummaryModel {
  total_expenses: number;
  count: number;
  by_category: {
    category_id: number;
    category_name: string;
    total: number;
  }[];
}
