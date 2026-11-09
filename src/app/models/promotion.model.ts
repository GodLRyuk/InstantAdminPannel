export interface CouponValidationRequest {
  code: string;
  order_total: number;
}

export type CouponType = 'PERCENTAGE' | 'FIXED';

export interface Coupon {
  id: number;
  code: string;
  coupon_type: CouponType;
  value: number | string;
  min_order_amount: number | string;
  active: boolean;
  expires_at: string | null;
  one_time_per_user: boolean;
  pass_members_only: boolean;
}

export interface CouponPayload {
  code: string;
  coupon_type: CouponType;
  value: number;
  min_order_amount: number;
  active: boolean;
  expires_at: string | null;
  one_time_per_user: boolean;
  pass_members_only: boolean;
}

export interface FlashSaleProduct {
  id: number;
  name?: string;
}

export interface FlashSale {
  id: number;
  title: string;
  products: Array<number | FlashSaleProduct>;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface FlashSalePayload {
  title: string;
  products: number[];
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export function getPromotionApiError(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'error' in error) {
    const response = error.error;
    if (typeof response === 'string') {
      if (/^\s*(<!doctype html|<html\b)/i.test(response)) {
        const status = 'status' in error && typeof error.status === 'number'
          ? ` (HTTP ${error.status})`
          : '';
        return `The API returned an HTML error page${status}. Confirm that the endpoint is configured on the server.`;
      }
      return response;
    }
    if (typeof response === 'object' && response !== null) {
      if ('detail' in response && typeof response.detail === 'string') {
        return response.detail;
      }
      if ('message' in response && typeof response.message === 'string') {
        return response.message;
      }

      const fieldErrors = Object.entries(response)
        .flatMap(([field, messages]) => {
          const values = Array.isArray(messages) ? messages : [messages];
          return values
            .filter((message): message is string => typeof message === 'string')
            .map((message) => `${field}: ${message}`);
        });
      if (fieldErrors.length > 0) {
        return fieldErrors.join(' ');
      }
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
