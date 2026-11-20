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

  it('shows reserved stock and uses available stock for badges and row styling', () => {
    component.inventoryItems = [
      { product: 7, product_name: 'Coffee', total_stock: 10, available_stock: 0, reserved_stock: 10, unit: null },
      { product: 8, product_name: 'Tea', total_stock: 10, available_stock: 5, reserved_stock: 5, unit: null },
      { product: 9, product_name: 'Milk', total_stock: 10, available_stock: 6, reserved_stock: 4, unit: null },
    ];
    component.applyFilter();
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(Array.from(rows[0].cells, (cell: HTMLTableCellElement) => cell.textContent.trim()).slice(2))
      .toEqual(['10', '0', '10', 'Out of Stock']);
    expect(rows[0].classList.contains('out-stock-row')).toBe(true);
    expect(rows[1].querySelector('.low-stock').textContent.trim()).toBe('Low Stock');
    expect(rows[1].classList.contains('low-stock-row')).toBe(true);
    expect(rows[2].querySelector('.in-stock').textContent.trim()).toBe('In Stock');
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
