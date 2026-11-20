import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MasterService } from '../../services/auth.service';
import { StoreSale } from './store-sale';

describe('StoreSale', () => {
  let component: StoreSale;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StoreSale],
      providers: [
        provideRouter([]),
        {
          provide: MasterService,
          useValue: {
            getAllProducts: () => of([
              { id: 7, name: 'Whole Milk', barcode: '890100100001', price: '32', stock: 10 },
              { id: 8, name: 'Bread', barcode: '890100100002', price: '20', stock: 4 },
              { id: 9, name: 'Eggs', price: '25', stock: 5 },
            ]),
            getInventoryItem: () => of([
              { product: 7, total_stock: 10, available_stock: 2 },
              { product: 8, total_stock: 4, available_stock: 0 },
            ]),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(StoreSale);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('adds a matching scanned barcode and caps the bill at available stock', () => {
    component.barcode = ' 890100100001 ';
    component.addByBarcode();

    expect(component.billItems).toHaveLength(1);
    const item = component.billItems[0];
    expect(item.name).toBe('Whole Milk');
    expect(component.subtotal).toBe(32);
    expect(component.scanMessageType).toBe('success');

    component.changeQuantity(item, 3);
    expect(item.quantity).toBe(2);
    expect(component.isAtStockLimit(component.products[0])).toBe(true);
    expect(component.addProduct(component.products[0])).toBe(false);

    component.barcode = '890100100001';
    component.addByBarcode();
    expect(component.scanMessageType).toBe('error');
    expect(item.quantity).toBe(2);
  });

  it('blocks products with no available stock or no inventory record', () => {
    for (const product of component.products.slice(1)) {
      expect(product.availableStock).toBe(0);
      expect(component.isAtStockLimit(product)).toBe(true);
      expect(component.addProduct(product)).toBe(false);
    }
    expect(component.billItems).toHaveLength(0);
  });

  it('keeps the bill unchanged when the barcode is unknown', () => {
    component.barcode = 'unknown';

    component.addByBarcode();

    expect(component.billItems).toHaveLength(0);
    expect(component.scanMessageType).toBe('error');
  });
});
