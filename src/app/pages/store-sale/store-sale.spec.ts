import { StoreSale } from './store-sale';

describe('StoreSale', () => {
  it('adds a matching scanned barcode to the bill', () => {
    const component = new StoreSale();
    component.barcode = ' 890100100001 ';

    component.addByBarcode();

    expect(component.billItems).toHaveLength(1);
    expect(component.billItems[0].name).toBe('Whole Milk');
    expect(component.subtotal).toBe(32);
    expect(component.scanMessageType).toBe('success');
  });

  it('keeps the bill unchanged when the barcode is unknown', () => {
    const component = new StoreSale();
    component.barcode = 'unknown';

    component.addByBarcode();

    expect(component.billItems).toHaveLength(0);
    expect(component.scanMessageType).toBe('error');
  });
});
