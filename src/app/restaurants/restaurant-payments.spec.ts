import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';
import { roleAccessGuard } from '../guards/role-access.guard';
import { RestaurantAdminService } from './restaurant-admin.service';
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

  it('links staff directly to the confirmed Django models', () => {
    const component = TestBed.runInInjectionContext(() => new RestaurantPaymentsComponent());
    expect(new URL(component.adminLinks.vendors).pathname).toBe('/admin/restaurants/restaurantvendor/');
    expect(new URL(component.adminLinks.commissions).pathname).toBe('/admin/restaurants/vendorcommission/');
    expect(new URL(component.adminLinks.splits).pathname).toBe('/admin/restaurants/paymentsplit/');
    expect(new URL(component.adminLinks.refunds).pathname).toBe('/admin/restaurants/restaurantrefund/');
    http.expectNone(request => request.url.includes('/partner/vendor/'));
  });

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
