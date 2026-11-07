import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { CouponValidationRequest, getPromotionApiError } from '../../models/promotion.model';
import { MasterService } from '../../services/auth.service';

@Component({
  selector: 'app-coupon-validation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coupon-validation.html',
  styleUrl: './coupon-validation.css',
})
export class CouponValidation {
  readonly couponAdminUrl = `${environment.apiUrl.replace(/\/api\/?$/, '')}/admin/promotions/coupon/`;
  form: CouponValidationRequest = { code: '', order_total: 0 };
  result: unknown = null;
  errorMessage = '';
  loading = false;

  constructor(private masterService: MasterService) {}

  validateCoupon(): void {
    const request = {
      code: this.form.code.trim(),
      order_total: Number(this.form.order_total),
    };
    if (!request.code || !Number.isFinite(request.order_total) || request.order_total < 0 || this.loading) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.result = null;
    this.masterService.validateCoupon(request).subscribe({
      next: (result) => {
        this.result = result;
        this.loading = false;
      },
      error: (error: unknown) => {
        this.errorMessage = getPromotionApiError(error, 'Unable to validate this coupon.');
        console.error('Coupon validation failed.', error);
        this.loading = false;
      },
    });
  }

  formatResult(): string {
    return JSON.stringify(this.result, null, 2);
  }
}
