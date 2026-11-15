import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ProductModel } from '../../models/products.model';
import { MasterService } from '../../services/auth.service';
import { Inventory } from './inventory';

describe('Inventory', () => {
  let component: Inventory;
  let fixture: ComponentFixture<Inventory>;

  const product: ProductModel = {
    id: 7,
    name: 'Coffee',
    price: '12.50',
    discount_percent: '0',
    description: '',
    image: null,
    is_active: true,
    created_at: '',
    category: 1,
    subcategory: 1,
    brand: null,
    unit: 1,
    unit_size: null,
    barcode: '123456789',
  };
  const masterService = {
    getInventoryItem: vi.fn(() => of([])),
    getAllProducts: vi.fn(() => of([product])),
    addStock: vi.fn(() => of({})),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [Inventory],
      providers: [{ provide: MasterService, useValue: masterService }],
    }).compileComponents();

    fixture = TestBed.createComponent(Inventory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('finds a product by an exact scanned barcode', () => {
    component.products = [product];
    component.productsLoaded = true;
    component.scannedBarcode = ' 123456789 ';

    component.onBarcodeScanned();

    expect(component.selectedProduct).toBe(product);
    expect(component.sellingPrice).toBe(12.5);
  });

  it('adds scanned stock through the existing stock API', () => {
    component.products = [product];
    component.productsLoaded = true;
    component.scannedBarcode = product.barcode ?? '';
    component.onBarcodeScanned();
    component.batchNumber = 'BATCH-1';
    component.stockQuantity = 5;
    component.purchasePrice = 8;

    component.addScannedStock();

    expect(masterService.addStock).toHaveBeenCalledWith({
      product: product.id,
      batch_no: 'BATCH-1',
      quantity: 5,
      purchase_price: 8,
      selling_price: 12.5,
    });
  });
});
