import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Coupon, CouponPayload, CouponType, getPromotionApiError } from '../../models/promotion.model';
import { MasterService } from '../../services/auth.service';

@Component({
  selector: 'app-coupon-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coupon-validation.html',
  styleUrl: './coupon-validation.css',
})
export class CouponManagement implements OnInit {
  coupons: Coupon[] = [];
  form = this.emptyForm();
  readonly couponTypes: CouponType[] = ['PERCENTAGE', 'FIXED'];
  editingId: number | null = null;
  loading = false;
  saving = false;
  deletingId: number | null = null;
  errorMessage = '';
  successMessage = '';

  constructor(private masterService: MasterService) {}

  ngOnInit(): void {
    this.loadCoupons();
  }

  loadCoupons(): void {
    this.loading = true;
    this.errorMessage = '';
    this.masterService.getCoupons().subscribe({
      next: (response) => {
        this.coupons = Array.isArray(response) ? response : response.results;
        this.loading = false;
      },
      error: (error: unknown) => {
        this.errorMessage = getPromotionApiError(error, 'Unable to load coupons.');
        console.error('Loading coupons failed.', error);
        this.loading = false;
      },
    });
  }

  openCreateForm(): void {
    this.editingId = null;
    this.form = this.emptyForm();
    this.errorMessage = '';
    this.successMessage = '';
  }

  editCoupon(coupon: Coupon): void {
    this.editingId = coupon.id;
    this.errorMessage = '';
    this.successMessage = '';
    this.form = {
      code: coupon.code,
      coupon_type: coupon.coupon_type,
      value: Number(coupon.value),
      min_order_amount: Number(coupon.min_order_amount),
      active: coupon.active,
      expires_at: this.toLocalDateTime(coupon.expires_at),
      one_time_per_user: coupon.one_time_per_user,
      pass_members_only: coupon.pass_members_only ?? false,
    };
  }

  cancelEdit(): void {
    this.openCreateForm();
  }

  saveCoupon(): void {
    const payload = this.toPayload();
    if (!payload || this.saving) {
      if (!payload) {
        this.errorMessage = 'Enter a code, choose a coupon type, and provide valid non-negative amounts.';
      }
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';
    const editingId = this.editingId;
    const request = editingId === null
      ? this.masterService.createCoupon(payload)
      : this.masterService.updateCoupon(editingId, payload);

    request.subscribe({
      next: () => {
        this.editingId = null;
        this.form = this.emptyForm();
        this.successMessage = editingId === null ? 'Coupon created.' : 'Coupon updated.';
        this.saving = false;
        this.loadCoupons();
      },
      error: (error: unknown) => {
        this.errorMessage = getPromotionApiError(error, 'Unable to save this coupon.');
        console.error('Saving coupon failed.', error);
        this.saving = false;
      },
    });
  }

  deleteCoupon(coupon: Coupon): void {
    if (this.deletingId !== null || !confirm(`Delete coupon "${coupon.code}"? This cannot be undone.`)) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.deletingId = coupon.id;
    this.masterService.deleteCoupon(coupon.id).subscribe({
      next: () => {
        this.successMessage = `Coupon ${coupon.code} deleted.`;
        this.deletingId = null;
        if (this.editingId === coupon.id) {
          this.editingId = null;
          this.form = this.emptyForm();
        }
        this.loadCoupons();
      },
      error: (error: unknown) => {
        this.errorMessage = getPromotionApiError(error, 'Unable to delete this coupon.');
        console.error('Deleting coupon failed.', error);
        this.deletingId = null;
      },
    });
  }

  private toPayload(): CouponPayload | null {
    const value = Number(this.form.value);
    const minOrderAmount = Number(this.form.min_order_amount);
    const expiresAt = this.form.expires_at ? new Date(this.form.expires_at) : null;
    if (
      !this.form.code.trim()
      || !this.couponTypes.includes(this.form.coupon_type)
      || !Number.isFinite(value)
      || value < 0
      || !Number.isFinite(minOrderAmount)
      || minOrderAmount < 0
      || (expiresAt !== null && !Number.isFinite(expiresAt.getTime()))
    ) {
      return null;
    }

    return {
      code: this.form.code.trim().toUpperCase(),
      coupon_type: this.form.coupon_type,
      value,
      min_order_amount: minOrderAmount,
      active: this.form.active,
      expires_at: expiresAt?.toISOString() ?? null,
      one_time_per_user: this.form.one_time_per_user,
      pass_members_only: this.form.pass_members_only,
    };
  }

  private toLocalDateTime(value: string | null): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) {
      return '';
    }

    const pad = (part: number) => String(part).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private emptyForm(): {
    code: string;
    coupon_type: CouponType;
    value: number;
    min_order_amount: number;
    active: boolean;
    expires_at: string;
    one_time_per_user: boolean;
    pass_members_only: boolean;
  } {
    return {
      code: '',
      coupon_type: 'PERCENTAGE',
      value: 0,
      min_order_amount: 0,
      active: true,
      expires_at: '',
      one_time_per_user: false,
      pass_members_only: false,
    };
  }
}
