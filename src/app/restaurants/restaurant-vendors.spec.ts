import { TestBed } from '@angular/core/testing';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NgForm } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { environment } from '../../environments/environment';
import { AuthInterceptor } from '../interceptors/auth-interceptor';
import { ApiErrorService } from '../services/api-error.service';
import { AuthService } from '../services/auth.service';
import { RestaurantAdminService } from './restaurant-admin.service';
import { AdminRestaurant } from './restaurant.models';
import { RestaurantVendorsComponent, maskVendorAccount } from './restaurant-vendors.component';

const base = `${environment.apiUrl}/restaurants/admin`;
const safeVendor = {
  id: 1, restaurant_id: 42, restaurant_name: 'Test restaurant', cashfree_vendor_id: 'vendor_42',
  verification_status: 'pending', settlement_status: 'pending', bank_account_last4: '9012',
  ifsc_code: 'ABCD0123456', updated_at: '2026-11-17T06:00:00Z',
};
const restaurant = { id: 42, name: 'Test restaurant', email: 'test@example.com', phone: '9999999999' } as AdminRestaurant;
const fakeForm = () => ({ invalid: false, resetForm: () => {} }) as unknown as NgForm;

describe('Staff vendor onboarding', () => {
  let http: HttpTestingController;
  let staff: boolean;
  let owner: boolean;
  beforeEach(() => {
    staff = true;
    owner = false;
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting(), provideRouter([]),
      { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
      { provide: AuthService, useValue: {
        isAuthenticated: () => true, isStaff: () => staff, isRestaurant: () => owner,
      } },
    ] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function ready() {
    const component = TestBed.runInInjectionContext(() => new RestaurantVendorsComponent());
    component.restaurants.set([restaurant]);
    component.restaurantId = 42;
    component.details = {
      account_number: '123456789012', ifsc_code: 'abcd0123456', account_holder_name: 'Test Owner',
      pan: 'abcde1234f', business_type: 'individual', gstin: '',
    };
    return component;
  }

  it('loads the staff vendor list and renders only a masked bank account', async () => {
    const fixture = TestBed.createComponent(RestaurantVendorsComponent);
    fixture.detectChanges();
    http.expectOne(`${base}/vendors/`).flush([safeVendor]);
    http.expectOne(`${base}/restaurants/`).flush([restaurant]);
    fixture.detectChanges();
    await fixture.whenStable();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('vendor_42');
    expect(text).toContain('•••• 9012');
    expect(text).not.toContain('123456789012');
    expect(text).not.toContain('Django');
    fixture.destroy();
  });

  it('submits the staff payload once, omits blank GSTIN, and clears sensitive fields after success', () => {
    const component = ready();
    component.submit(fakeForm());
    component.submit(fakeForm());
    const request = http.expectOne(`${base}/vendors/`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ restaurant_id: 42, account_number: '123456789012',
      ifsc_code: 'ABCD0123456', account_holder_name: 'Test Owner', pan: 'ABCDE1234F', business_type: 'individual' });
    request.flush(safeVendor);
    expect(component.details.account_number).toBe('');
    expect(component.details.pan).toBe('');
    expect(component.restaurantId).toBeNull();
    http.expectOne(`${base}/vendors/`).flush([safeVendor]);
    expect(component.vendors()).toEqual([safeVendor]);
  });

  it('blocks registration for missing contact data and invalid bank/KYC details', () => {
    const component = ready();
    component.restaurants.set([{ ...restaurant, email: '' }]);
    component.submit(fakeForm());
    expect(component.canRegister()).toBe(false);
    component.restaurants.set([restaurant]);
    component.details.pan = 'invalid';
    component.submit(fakeForm());
    expect(component.error()).toContain('Check');
    http.expectNone(request => request.method === 'POST');
  });

  it('allows explicit retry after 502 without exposing server error content', () => {
    const component = ready();
    component.submit(fakeForm());
    http.expectOne(`${base}/vendors/`).flush({ detail: 'Sensitive: 123456789012 ABCDE1234F' }, { status: 502, statusText: 'Bad Gateway' });
    expect(component.error()).toContain('Details saved securely');
    expect(component.error()).toContain('encrypted details');
    http.expectOne(`${base}/vendors/`).flush([{ ...safeVendor, cashfree_vendor_id: '', verification_status: 'NOT_SUBMITTED' }]);
    expect(component.vendors()[0].verification_status).toBe('NOT_SUBMITTED');
    expect(component.error()).not.toContain('123456789012');
    expect(component.error()).not.toContain('ABCDE1234F');
    expect(TestBed.inject(ApiErrorService).alert()).toBeNull();
    expect(component.saving()).toBe(false);
    component.submit(fakeForm());
    http.expectOne(`${base}/vendors/`).flush({}, { status: 400, statusText: 'Bad Request' });
    expect(component.error()).toContain('Registration was rejected');
  });

  it('clears details on restaurant change and component destruction', () => {
    const fixture = TestBed.createComponent(RestaurantVendorsComponent);
    const component = fixture.componentInstance;
    component.details.pan = 'ABCDE1234F';
    component.selectionChanged();
    expect(component.details.pan).toBe('');
    component.details.account_number = '123456789012';
    fixture.destroy();
    expect(component.details.account_number).toBe('');
  });

  it('does not fetch or submit vendor data for customer or restaurant accounts', () => {
    for (const role of ['customer', 'restaurant']) {
      staff = false;
      owner = role === 'restaurant';
      const component = ready();
      component.ngOnInit();
      component.submit(fakeForm());
      const api = TestBed.inject(RestaurantAdminService);
      let errors = 0;
      api.vendors().subscribe({ error: () => errors++ });
      api.onboardVendor({ restaurant_id: 42, ...component.details }).subscribe({ error: () => errors++ });
      expect(errors).toBe(2);
    }
    http.expectNone(() => true);
  });

  it('prepares retry for the saved restaurant without using masked digits as bank details', () => {
    const component = ready();
    component.restaurantId = null;
    component.prepareRetry({ ...safeVendor, cashfree_vendor_id: '', verification_status: 'NOT_SUBMITTED' });
    expect(component.editingVendor()?.restaurant_id).toBe(42);
    expect(component.restaurantId).toBe(42);
    expect(component.details.account_number).toBe('');
    expect(component.details.pan).toBe('');
    expect(component.details.ifsc_code).toBe('ABCD0123456');
    expect(component.message()).toContain('Complete the bank and KYC fields');
    http.expectNone(request => request.method === 'POST');
    component.details = {
      account_number: '987654321098', ifsc_code: 'ABCD0123456', account_holder_name: 'Updated Owner',
      pan: 'ABCDE1234F', business_type: 'individual', gstin: '',
    };
    component.submit(fakeForm());
    const request = http.expectOne(`${base}/vendors/`);
    expect(request.request.body.restaurant_id).toBe(42);
    expect(request.request.body.account_number).toBe('987654321098');
    request.flush(safeVendor);
    http.expectOne(`${base}/vendors/`).flush([safeVendor]);
    expect(component.editingVendor()).toBeNull();
    expect(component.details.account_number).toBe('');
  });

  it('never displays more than the last four bank digits', () => {
    expect(maskVendorAccount('123456789012')).toBe('•••• 9012');
    expect(maskVendorAccount('')).toBe('Not provided');
  });
});
