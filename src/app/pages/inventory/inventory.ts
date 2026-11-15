import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MasterService } from '../../services/auth.service';
import { InventoryModel } from '../../models/inventory.model';
import { ProductModel } from '../../models/products.model';
import { StockModel } from '../../models/stock.model';
import { getVisiblePageNumbers } from '../../shared/pagination';

@Component({
  selector: 'app-inventory',
  standalone: false,
  templateUrl: './inventory.html',
  styleUrl: './inventory.css',
})
export class Inventory implements OnInit {

  inventoryItems: InventoryModel[] = [];
  filteredItems: InventoryModel[] = [];
  pagedItems: InventoryModel[] = [];
  products: ProductModel[] = [];

  showModal = false;
  modalType: 'add' | 'edit' = 'add';
  showBarcodeModal = false;
  productsLoaded = false;
  productsLoadFailed = false;
  savingStock = false;
  scannedBarcode = '';
  barcodeMessage = '';
  barcodeMessageType: 'info' | 'success' | 'error' = 'info';
  selectedProduct: ProductModel | null = null;
  batchNumber = '';
  stockQuantity = 1;
  purchasePrice = 0;
  sellingPrice = 0;

  @ViewChild('barcodeInput') barcodeInput?: ElementRef<HTMLInputElement>;

  // Search
  searchTerm = '';

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  constructor(
    private masterService: MasterService,
    private cdf: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadInventoryItem();
    this.loadProducts();
  }

  loadProducts(): void {
    this.productsLoadFailed = false;
    this.masterService.getAllProducts().subscribe({
      next: (data: ProductModel[]) => {
        this.products = data;
        this.productsLoaded = true;
        this.productsLoadFailed = false;
        if (this.showBarcodeModal && !this.selectedProduct) {
          this.setBarcodeMessage('Scan a product barcode, then press Enter.', 'info');
        }
        this.cdf.detectChanges();
      },
      error: err => {
        console.error('Error loading products for barcode scanning', err);
        this.productsLoadFailed = true;
        this.setBarcodeMessage('Unable to load products. Try again.', 'error');
        this.cdf.detectChanges();
      }
    });
  }

  loadInventoryItem() {
    this.masterService.getInventoryItem().subscribe({
      next: (data: InventoryModel[]) => {
        this.inventoryItems = data;
        this.applyFilter();
        this.cdf.detectChanges();
      },
      error: err => console.error('Error loading inventoryItems', err)
    });
  }

  // Search
  onSearch() {
    this.currentPage = 1;
    this.applyFilter();
  }

  applyFilter() {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredItems = term
      ? this.inventoryItems.filter(i => i.product_name.toLowerCase().includes(term))
      : this.inventoryItems;

    this.totalPages = Math.max(1, Math.ceil(this.filteredItems.length / this.pageSize));
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    this.updatePagedItems();
  }

  // Pagination
  updatePagedItems() {
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedItems = this.filteredItems.slice(start, start + this.pageSize);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.updatePagedItems();
  }

  get pages(): number[] {
    return getVisiblePageNumbers(this.currentPage, this.totalPages);
  }

  openAddModal() {
    this.modalType = 'add';
    this.showModal = true;
  }

  openEditModal(brand: InventoryModel) {
    this.modalType = 'edit';
    this.showModal = true;
  }

  openBarcodeScanner(): void {
    this.showBarcodeModal = true;
    this.scannedBarcode = '';
    this.selectedProduct = null;
    this.batchNumber = '';
    this.stockQuantity = 1;
    this.purchasePrice = 0;
    this.sellingPrice = 0;
    if (this.productsLoadFailed) {
      this.setBarcodeMessage('Unable to load products. Try again.', 'error');
    } else {
      this.setBarcodeMessage(
        this.productsLoaded ? 'Scan a product barcode, then press Enter.' : 'Loading products...',
        'info'
      );
    }
    this.cdf.detectChanges();
    this.barcodeInput?.nativeElement.focus();
  }

  closeBarcodeScanner(): void {
    if (this.savingStock) return;
    this.showBarcodeModal = false;
  }

  onBarcodeScanned(): void {
    const barcode = this.scannedBarcode.trim();
    if (!barcode) {
      this.selectedProduct = null;
      this.setBarcodeMessage('Scan or enter a barcode first.', 'error');
      return;
    }

    if (!this.productsLoaded) {
      this.setBarcodeMessage('Products are still loading. Please scan again in a moment.', 'info');
      return;
    }

    const product = this.products.find(item => item.barcode?.trim() === barcode);
    if (!product) {
      this.selectedProduct = null;
      this.setBarcodeMessage(`No product found for barcode "${barcode}".`, 'error');
      return;
    }

    this.selectedProduct = product;
    this.batchNumber = '';
    this.stockQuantity = 1;
    this.purchasePrice = 0;
    const productPrice = Number(product.price);
    this.sellingPrice = Number.isFinite(productPrice) ? productPrice : 0;
    this.setBarcodeMessage('Product found. Enter the stock batch and quantity to continue.', 'success');
  }

  onBarcodeInputChange(): void {
    if (this.selectedProduct && this.scannedBarcode.trim() !== (this.selectedProduct.barcode ?? '').trim()) {
      this.selectedProduct = null;
    }
    if (this.barcodeMessageType !== 'info') {
      this.setBarcodeMessage('', 'info');
    }
  }

  retryLoadProducts(): void {
    this.setBarcodeMessage('Loading products...', 'info');
    this.loadProducts();
  }

  get canAddScannedStock(): boolean {
    return !!this.selectedProduct &&
      !!this.batchNumber.trim() &&
      Number.isFinite(this.stockQuantity) &&
      this.stockQuantity > 0 &&
      Number.isFinite(this.purchasePrice) &&
      this.purchasePrice >= 0 &&
      Number.isFinite(this.sellingPrice) &&
      this.sellingPrice >= 0 &&
      !this.savingStock;
  }

  addScannedStock(): void {
    if (!this.selectedProduct || !this.canAddScannedStock) return;

    const product = this.selectedProduct;
    const payload: Partial<StockModel> = {
      product: product.id,
      batch_no: this.batchNumber.trim(),
      quantity: this.stockQuantity,
      purchase_price: this.purchasePrice,
      selling_price: this.sellingPrice,
    };

    this.savingStock = true;
    this.masterService.addStock(payload).subscribe({
      next: () => {
        this.savingStock = false;
        this.selectedProduct = null;
        this.scannedBarcode = '';
        this.batchNumber = '';
        this.stockQuantity = 1;
        this.purchasePrice = 0;
        this.sellingPrice = 0;
        this.loadInventoryItem();
        this.setBarcodeMessage(`${product.name} stock added. Scan another barcode to continue.`, 'success');
        this.cdf.detectChanges();
        this.barcodeInput?.nativeElement.focus();
      },
      error: err => {
        console.error('Add stock from barcode failed', err);
        this.savingStock = false;
        const detail = err?.error?.detail || err?.error?.non_field_errors?.[0];
        this.setBarcodeMessage(detail || 'Unable to add stock. Check the stock details and try again.', 'error');
        this.cdf.detectChanges();
      }
    });
  }

  private setBarcodeMessage(message: string, type: 'info' | 'success' | 'error'): void {
    this.barcodeMessage = message;
    this.barcodeMessageType = type;
  }

}