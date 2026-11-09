import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { Coupon } from '../../models/promotion.model';
import { MasterService } from '../../services/auth.service';
import { CouponManagement } from './coupon-validation';

describe('CouponManagement', () => {
  const coupon: Coupon = {
    id: 1,
    code: 'WELCOME10',
    coupon_type: 'PERCENTAGE',
    value: '10.00',
    min_order_amount: '299.00',
    active: true,
    expires_at: null,
    one_time_per_user: false,
    pass_members_only: false,
  };
  const masterService = {
    getCoupons: vi.fn(() => of([coupon])),
    createCoupon: vi.fn(() => of(coupon)),
    updateCoupon: vi.fn(() => of(coupon)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [CouponManagement],
      providers: [{ provide: MasterService, useValue: masterService }],
    }).compileComponents();
  });

  it('includes the pass-member option when creating a coupon', () => {
    const fixture = TestBed.createComponent(CouponManagement);
    const component = fixture.componentInstance;
    component.form = {
      code: 'welcome10',
      coupon_type: 'PERCENTAGE',
      value: 10,
      min_order_amount: 299,
      active: true,
      expires_at: '',
      one_time_per_user: false,
      pass_members_only: true,
    };

    component.saveCoupon();

    expect(masterService.createCoupon).toHaveBeenCalledWith({
      code: 'WELCOME10',
      coupon_type: 'PERCENTAGE',
      value: 10,
      min_order_amount: 299,
      active: true,
      expires_at: null,
      one_time_per_user: false,
      pass_members_only: true,
    });
  });

  it('prefills and sends the pass-member option when updating a coupon', () => {
    const fixture = TestBed.createComponent(CouponManagement);
    const component = fixture.componentInstance;
    component.editCoupon({ ...coupon, pass_members_only: true });

    expect(component.form.pass_members_only).toBe(true);

    component.saveCoupon();

    expect(masterService.updateCoupon).toHaveBeenCalledWith(1, expect.objectContaining({
      pass_members_only: true,
    }));
  });
});
