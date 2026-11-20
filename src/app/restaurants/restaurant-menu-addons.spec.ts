import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';
import { RestaurantAdminService } from './restaurant-admin.service';
import { RestaurantMenuAddonsComponent } from './restaurant-menu-addons.component';

const base = `${environment.apiUrl}/restaurants`;
const groupsUrl = `${base}/partner/items/42/addon-groups/`;

describe('Restaurant menu add-ons', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: AuthService, useValue: {} },
    ] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads options for the selected group and discards the request when the edited item changes', () => {
    const fixture = TestBed.createComponent(RestaurantMenuAddonsComponent);
    fixture.componentRef.setInput('itemId', 42);
    fixture.detectChanges();
    http.expectOne({ method: 'GET', url: groupsUrl }).flush({
      results: [{ id: 8, name: 'Toppings', min_select: 0, max_select: 2 }],
    });
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const group = Array.from(element.querySelectorAll('button'))
      .find((button) => button.textContent.trim() === 'Toppings');
    expect(group).toBeDefined();
    group?.click();
    const request = http.expectOne({ method: 'GET', url: `${groupsUrl}8/options/` });

    fixture.componentRef.setInput('itemId', 43);
    fixture.detectChanges();
    expect(request.cancelled).toBe(true);
    http.expectOne({ method: 'GET', url: `${base}/partner/items/43/addon-groups/` }).flush([]);
    fixture.detectChanges();
    expect(element.textContent).not.toContain('Toppings');
  });

  it('keeps add-on selections on each line of both quote and order requests', () => {
    const api = TestBed.inject(RestaurantAdminService);
    const payload = {
      restaurant_id: 9,
      address_id: 12,
      items: [
        { menu_item_id: 42, quantity: 2, addon_option_ids: [105, 106] },
        { menu_item_id: 42, quantity: 1, addon_option_ids: [] },
      ],
    };

    api.quoteOrder(payload).subscribe();
    const quote = http.expectOne({ method: 'POST', url: `${base}/orders/quote/` });
    expect(quote.request.body).toEqual(payload);
    quote.flush({});

    api.placeOrder({ ...payload, payment_method: 'cod' }).subscribe();
    const order = http.expectOne({ method: 'POST', url: `${base}/orders/` });
    expect(order.request.body).toEqual({ ...payload, payment_method: 'cod' });
    order.flush({});
  });
});
