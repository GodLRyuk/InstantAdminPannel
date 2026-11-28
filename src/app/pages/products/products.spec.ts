import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ApiErrorService } from '../../services/api-error.service';
import { MasterService } from '../../services/auth.service';
import { Products } from './products';

describe('Products combo pricing', () => {
  const addProduct = vi.fn();
  const getProduct = vi.fn();
  const updateProduct = vi.fn();
  let component: Products;

  beforeEach(() => {
    vi.resetAllMocks();
    const service = {
      addProduct,
      getProduct,
      updateProduct,
      getAllProducts: () => of([]),
    } as unknown as MasterService;
    const changeDetector = { detectChanges: () => {} } as ChangeDetectorRef;
    component = new Products(service, changeDetector, new ApiErrorService());
  });

  it('creates a combo with a decimal string and previews the full offer', () => {
    component.openAddModal();
    expect(component.product.is_combo).toBe(false);
    expect(component.product.combo_repeat).toBe(true);
    const product = Object.assign(component.product, {
      name: 'Product',
      price: '27.00',
      barcode: '12345',
      is_combo: true,
      combo_buy_qty: 4,
      combo_free_qty: 1,
      combo_price: '110',
    });
    addProduct.mockReturnValue(of({ ...product, id: 1 }));
    expect(component.comboPreview).toBe('Customer selects 4 · receives 5 pieces · pays ₹110');

    component.save();

    const data: FormData = addProduct.mock.calls[0][0];
    expect(data.get('is_combo')).toBe('true');
    expect(data.get('combo_buy_qty')).toBe('4');
    expect(data.get('combo_free_qty')).toBe('1');
    expect(data.get('combo_price')).toBe('110.00');
    expect(data.get('combo_repeat')).toBe('true');
  });

  it('loads the saved details and preserves them when disabling combo pricing', () => {
    const row = { ...component.getEmptyProduct(), id: 1, name: 'Product' };
    const settings = {
      is_combo: true,
      combo_buy_qty: 4,
      combo_free_qty: 1,
      combo_price: '110.00',
      combo_repeat: false,
    };
    getProduct.mockReturnValue(of({ ...row, ...settings }));
    updateProduct.mockReturnValue(of({ ...row, ...settings, is_combo: false }));
    component.openEditModal(row);

    expect(getProduct).toHaveBeenCalledWith(1);
    expect(component.product).toMatchObject(settings);
    component.save();
    expect(updateProduct.mock.calls[0][1].get('combo_repeat')).toBe('false');

    getProduct.mockReturnValue(of({ ...row, ...settings }));
    component.openEditModal(row);
    component.product.is_combo = false;
    component.save();

    const [id, data] = updateProduct.mock.calls[1];
    expect(id).toBe(1);
    expect(data.get('is_combo')).toBe('false');
    for (const field of ['combo_buy_qty', 'combo_free_qty', 'combo_price', 'combo_repeat']) {
      expect(data.has(field)).toBe(false);
    }
  });

  it('validates inputs and shows API validation errors beside the affected fields', () => {
    component.openAddModal();
    Object.assign(component.product, {
      name: 'Product',
      barcode: '12345',
      is_combo: true,
      combo_buy_qty: 1.5,
      combo_free_qty: -1,
      combo_price: '0.001',
    });
    component.save();

    expect(addProduct).not.toHaveBeenCalled();
    expect(Object.keys(component.comboErrors)).toEqual(['combo_buy_qty', 'combo_free_qty', 'combo_price']);

    Object.assign(component.product, { combo_buy_qty: 1, combo_free_qty: 0, combo_price: '.50' });
    addProduct.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 400,
      error: { combo_price: ['Server price error.'], combo_repeat: ['Server repeat error.'] },
    })));
    component.save();

    expect(component.comboErrors).toEqual({
      combo_price: 'Server price error.',
      combo_repeat: 'Server repeat error.',
    });
  });
});
