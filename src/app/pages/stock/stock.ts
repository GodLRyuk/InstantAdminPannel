import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { StockModel } from '../../models/stock.model';
import { MasterService } from '../../services/auth.service';

@Component({
  selector: 'app-stock',
  standalone: false,
  templateUrl: './stock.html',
  styleUrls: ['./stock.css']
})
export class Stock implements OnInit {

  stocks: StockModel[] = [];
  filteredStocks: StockModel[] = [];
  pagedStocks: StockModel[] = [];

  products: { id: number; name: string }[] = [];
  showModal = false;
  modalType: 'add' | 'edit' = 'add';
  selectedStock: StockModel | null = null;
  stockData: StockModel = this.getEmptyStock();

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
    this.masterService.getAllstock().subscribe({
      next: (data: any) => {
        this.stocks = data;
        this.applyFilter();
        this.cdf.detectChanges();
      },
      error: err => console.error('Error loading stocks', err)
    });
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
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  openAddModal() {
    this.modalType = 'add';
    this.selectedStock = null;
    this.stockData = this.getEmptyStock();
    this.showModal = true;
  }

  openEditModal(stock: StockModel) {
    this.modalType = 'edit';
    this.selectedStock = stock;
    this.stockData = { ...stock };
    this.showModal = true;
  }

  save() {
    if (this.modalType === 'add') {
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