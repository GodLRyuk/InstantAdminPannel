export interface AnalyticsSalesMetrics {
  order_count: number;
  units_sold: number;
  item_subtotal: string;
  discounts: string;
  delivery_fees: string;
  order_revenue: string;
}

export interface AnalyticsOverview {
  start_date: string;
  end_date: string;
  sales_definitions: Record<string, string>;
  sales: AnalyticsSalesMetrics;
  inventory: {
    total_products: number;
    total_units: number;
    available_units: number;
    low_stock_count: number;
  };
}

export interface AnalyticsSalesPeriod extends AnalyticsSalesMetrics {
  period: string;
}

export interface AnalyticsSalesSummary {
  start_date: string;
  end_date: string;
  group_by: 'day' | 'week' | 'month';
  definitions: Record<string, string>;
  totals: AnalyticsSalesMetrics;
  periods: AnalyticsSalesPeriod[];
}

export interface AnalyticsTopProduct {
  product_id: number;
  product_name: string;
  units_sold: number;
  item_subtotal: string;
}

export interface AnalyticsTopProducts {
  start_date: string;
  end_date: string;
  sort_by: 'revenue' | 'quantity';
  sales_definitions: Record<string, string>;
  results: AnalyticsTopProduct[];
}

export interface AnalyticsDemandForecastResult {
  product_id: number;
  product_name: string;
  status: 'baseline_estimate' | 'insufficient_data';
  history: {
    start_date: string;
    end_date: string;
    calendar_days: number;
    sales_days: number;
    fulfilled_units: number;
  };
  forecast: Array<{
    date: string;
    predicted_units: string;
  }>;
  evaluation: {
    status: 'evaluated' | 'insufficient_data';
    method: string;
    training_sales_days: number;
    mae_units: string | null;
    wape_percent: string | null;
  };
}

export interface AnalyticsDemandForecast {
  count: number;
  next: string | null;
  previous: string | null;
  results: AnalyticsDemandForecastResult[];
  generated_at: string;
  model: {
    name: string;
    version: string;
  };
  horizon_days: number;
  history: {
    start_date: string;
    end_date: string;
    minimum_sales_days: number;
  };
  sales_definitions: Record<string, string>;
  evaluation: {
    method: string;
    metrics: string[];
  };
  caveats: string[];
}

export interface AnalyticsInventoryItem {
  product_id: number;
  product_name: string;
  total_stock: number;
  reserved_stock: number;
  available_stock: number;
  low_stock_threshold: number;
  is_low_stock: boolean;
}

export interface AnalyticsInventoryInsights {
  count: number;
  next: string | null;
  previous: string | null;
  low_stock_count: number;
  results: AnalyticsInventoryItem[];
}

export interface AnalyticsDemandSignal {
  id: number;
  signal_type: 'SEARCH' | 'ADD_TO_CART';
  normalized_query: string;
  result_count: number | null;
  product: number | null;
  quantity: number | null;
  created_at: string;
}

export interface AnalyticsAssistantRequest {
  question: string;
  start_date: string;
  end_date: string;
}

export interface AnalyticsAssistantResponse {
  answer: string;
  intent: 'overview' | 'sales' | 'top_products' | 'inventory';
  start_date: string;
  end_date: string;
  model: string;
  data: Record<string, unknown>;
}
