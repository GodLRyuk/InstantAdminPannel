import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';
import { roleAccessGuard } from '../guards/role-access.guard';
import { RestaurantAdminService } from './restaurant-admin.service';
import { NgForm } from '@angular/forms';
import { RestaurantPaymentRecordsComponent } from './restaurant-payment-records.component';
import { RestaurantPaymentsComponent } from './restaurant-payments.component';

describe('Restaurant payment access and operations', () => {
  let http: HttpTestingController;
  let staff: boolean;
  let owner: boolean;
  beforeEach(() => {
    staff = true;
    owner = false;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { routeConfig: { path: 'payment-operations' } } } },
        { provide: AuthService, useValue: {
          isAuthenticated: () => true, isStaff: () => staff, isRestaurant: () => owner,
        } },
        { provide: Router, useValue: { parseUrl: (url: string) => url } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  for (const [action, path] of [
    ['splits', 'payment-splits/process'], ['sync', 'payment-splits/sync'], ['refunds', 'refunds/process'],
  ] as const) {
    it(`posts ${action} once to the staff endpoint`, () => {
      TestBed.inject(RestaurantAdminService).processPayments(action).subscribe();
      const request = http.expectOne(`${environment.apiUrl}/restaurants/admin/${path}/`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({});
      request.flush({});
    });
  }

  it('does not send an operations request for restaurant or customer accounts', () => {
    for (const role of ['restaurant', 'customer']) {
      staff = false;
      owner = role === 'restaurant';
      let denied = false;
      TestBed.inject(RestaurantAdminService).processPayments('refunds').subscribe({ error: () => { denied = true; } });
      expect(denied).toBe(true);
    }
    http.expectNone(request => request.method === 'POST');
  });

  it('blocks direct payment screen navigation for owners and customers', () => {
    for (const path of ['vendor-onboarding', 'commissions', 'payment-splits', 'refunds', 'payment-operations']) {
      for (const role of ['restaurant', 'customer', 'staff']) {
        staff = role === 'staff';
        owner = role === 'restaurant';
        const result = TestBed.runInInjectionContext(() => roleAccessGuard({} as never, { url: `/restaurants/${path}` } as never));
        expect(result === true).toBe(role === 'staff');
      }
    }
  });

  for (const page of ['commissions', 'payment-splits', 'refunds'] as const) {
    it(`opens the ${page} form inside Angular and submits once`, () => {
      const fixture = TestBed.createComponent(RestaurantPaymentRecordsComponent);
      fixture.componentRef.setInput('page', page);
      fixture.detectChanges();

      const url = `${environment.apiUrl}/restaurants/admin/${page}/`;
      http.expectOne({ url, method: 'GET' }).flush([]);
      fixture.detectChanges();
      fixture.nativeElement.querySelector('button').click();
      fixture.detectChanges();

      const component = fixture.componentInstance;
      expect(fixture.nativeElement.querySelector('form')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('a')).toBeNull();
      let payload: object;
      let record: object;
      if (page === 'commissions') {
        http.expectOne({ url: `${environment.apiUrl}/restaurants/admin/restaurants/`, method: 'GET' })
          .flush([{ id: 1, name: 'Test restaurant' }]);
        component.restaurant = 1;
        component.percentage = 12.5;
        component.effectiveFrom = '2026-11-18T09:00';
        payload = {
          restaurant: 1, commission_percentage: 12.5,
          effective_from: new Date(component.effectiveFrom).toISOString(),
        };
        record = { ...payload, id: 1, restaurant_name: 'Test restaurant', commission_percentage: '12.50' };
      } else {
        component.orderNumber = ' RO000123 ';
        payload = { order_number: 'RO000123' };
        record = {
          ...payload, id: 1, restaurant_name: 'Test restaurant', status: 'submitted', provider_reference: 'cf-123',
          ...(page === 'payment-splits'
            ? { gross_amount: '100.00', platform_commission: '12.50', vendor_amount: '87.50', commission_percentage: '12.50' }
            : { amount: '100.00' }),
        };
      }

      const validForm = { invalid: false } as NgForm;
      component.submit(validForm);
      component.submit(validForm);
      const request = http.expectOne({ url, method: 'POST' });
      expect(request.request.body).toEqual(payload);
      request.flush(record);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
      expect(fixture.nativeElement.querySelector('tbody')?.textContent).toContain('Test restaurant');
      expect(component.message()).toContain(page === 'commissions' ? 'Commission saved' : 'Submitted to Cashfree');
    });
  }

  for (const [action, path, counts, expected] of [
    ['splits', 'payment-splits/process', { processed: 3, failed: 1 }, 'Processed: 3. Failed: 1.'],
    ['sync', 'payment-splits/sync', { synced: 2, failed: 0 }, 'Synced: 2. Failed: 0.'],
    ['refunds', 'refunds/process', { processed: 0, failed: 1, synced: 4 }, 'Processed: 0. Failed: 1. Synced: 4.'],
  ] as const) {
    it(`shows backend counts for ${action} and blocks duplicate requests`, () => {
      const component = TestBed.runInInjectionContext(() => new RestaurantPaymentsComponent());
      component.prepare(action);
      component.run();
      component.run();
      const request = http.expectOne(`${environment.apiUrl}/restaurants/admin/${path}/`);
      request.flush(counts);
      expect(component.message()).toContain(expected);
      expect(component.busy()).toBe(false);
      expect(component.pending()).toBeNull();
    });
  }
});
