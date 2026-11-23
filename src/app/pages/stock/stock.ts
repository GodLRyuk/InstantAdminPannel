import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StockModel } from '../../models/stock.model';
import { MasterService } from '../../services/auth.service';
import { getVisiblePageNumbers } from '../../shared/pagination';

@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock.html',
  styleUrls: ['./stock.css']
})
export class Stock implements OnInit {

  stocks: StockModel[] = [];
  filteredStocks: StockModel[] = [];
  pagedStocks: StockModel[] = [];

  products: { id: number; name: string }[] = [];
  productSearchTerm = '';
  productDropdownOpen = false;
  showModal = false;
  modalType: 'add' | 'edit' = 'add';
  selectedStock: StockModel | null = null;
  stockData: StockModel = this.getEmptyStock();
  selectedBatchView: 'available' | 'history' = 'available';

  // Search
  searchTerm = '';

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  constructor(
    private masterService: MasterService,
    private cdf: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadstock();
    this.loadProducts();
  }

  loadProducts() {
    this.masterService.getAllProducts().subscribe({
      next: (data: any) => {
        this.products = data;
        this.cdf.detectChanges();
      },
      error: err => console.error('Error loading products', err)
    });
  }

  getEmptyStock(): StockModel {
    return {
      id: 0,
      product: 0,
      product_name: '',
      batch_no: '',
      quantity: 0,
      purchase_price: 0,
      selling_price: 0,
    };
  }

  loadstock() {
    this.masterService.getAllstock(this.selectedBatchView === 'history').subscribe({
      next: (data: StockModel[]) => {
        this.stocks = data.filter(stock =>
          this.selectedBatchView === 'history'
            ? Number(stock.quantity) <= 0
            : Number(stock.quantity) > 0
        );
        this.applyFilter();
        this.cdf.detectChanges();
      },
      error: err => console.error('Error loading stocks', err)
    });
  }

  selectBatchView(view: 'available' | 'history'): void {
    if (this.selectedBatchView === view) {
      return;
    }

    this.selectedBatchView = view;
    this.currentPage = 1;
    this.loadstock();
  }

  onSearch() {
    this.currentPage = 1;
    this.applyFilter();
  }

  applyFilter() {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredStocks = term
      ? this.stocks.filter(s =>
          (s.batch_no || '').toLowerCase().includes(term) ||
          (s.product_name || '').toLowerCase().includes(term)
        )
      : this.stocks;

    this.totalPages = Math.max(1, Math.ceil(this.filteredStocks.length / this.pageSize));
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    this.updatePagedStocks();
  }

  updatePagedStocks() {
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedStocks = this.filteredStocks.slice(start, start + this.pageSize);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.updatePagedStocks();
  }

  get pages(): number[] {
    return getVisiblePageNumbers(this.currentPage, this.totalPages);
  }

  openAddModal() {
    this.modalType = 'add';
    this.selectedStock = null;
    this.stockData = this.getEmptyStock();
    this.productSearchTerm = '';
    this.productDropdownOpen = false;
    this.showModal = true;
  }

  get filteredProducts() {
    const term = this.productSearchTerm.trim().toLowerCase();
    return this.products.filter(product => product.name.toLowerCase().includes(term));
  }

  get selectedProductName(): string {
    return this.products.find(product => product.id === this.stockData.product)?.name ?? 'Select a product';
  }

  toggleProductDropdown(): void {
    this.productSearchTerm = '';
    this.productDropdownOpen = !this.productDropdownOpen;
  }

  selectProduct(id: number): void {
    this.stockData.product = id;
    this.productDropdownOpen = false;
  }

  closeProductDropdownOnBlur(event: FocusEvent, dropdown: HTMLElement): void {
    if (!dropdown.contains(event.relatedTarget as Node | null)) {
      this.productDropdownOpen = false;
    }
  }

  openEditModal(stock: StockModel) {
    this.modalType = 'edit';
    this.selectedStock = stock;
    this.stockData = { ...stock };
    this.showModal = true;
  }

  save() {
    if (this.modalType === 'add') {
      if (!this.stockData.product) return;
      const { id, ...payload } = this.stockData;
      this.masterService.addStock(payload).subscribe({
        next: () => {
          this.loadstock();
          this.showModal = false;
        },
        error: (err) => console.error('Add stock failed', err)
      });
    } else if (this.modalType === 'edit' && this.selectedStock) {
      this.masterService.updateStock(this.selectedStock.id, this.stockData).subscribe({
        next: () => {
          this.loadstock();
          this.showModal = false;
        },
        error: (err) => console.error('Update stock failed', err)
      });
    }
  }

  deleteStock(id: number) {
    if (confirm('Are you sure you want to delete this stock?')) {
      this.masterService.deleteStock(id).subscribe(() => {
        this.loadstock();
      });
    }
  }

}
