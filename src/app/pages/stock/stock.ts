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
  products: { id: number; name: string }[] = []; 
  showModal = false;
  modalType: 'add' | 'edit' = 'add';
  selectedStock: StockModel | null = null;
  stockData: StockModel = this.getEmptyStock();

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
        this.products = data; // expects [{id:1,name:'Amul Butter'},...]
        this.cdf.detectChanges();
      },
      error: err => console.error('Error loading products', err)
    });
  }
  // ✅ Empty model initializer
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

  // ✅ Load stocks
  loadstock() {
    this.masterService.getAllstock().subscribe({
      next: (data: any) => {
        this.stocks = data;
        this.cdf.detectChanges();
      },
      error: err => console.error('Error loading stocks', err)
    });
  }

  // ✅ Open Add
  openAddModal() {
    this.modalType = 'add';
    this.selectedStock = null;
    this.stockData = this.getEmptyStock();
    this.showModal = true;
  }

  // ✅ Open Edit
  openEditModal(stock: StockModel) {
    this.modalType = 'edit';
    this.selectedStock = stock;
    this.stockData = { ...stock }; // clone
    this.showModal = true;
  }

  // ✅ Save (Add / Update)
  save() {
    if (this.modalType === 'add') {

      this.masterService.addStock(this.stockData)
        .subscribe(() => {
          this.loadstock();
          this.showModal = false;
        });

    } else if (this.modalType === 'edit' && this.selectedStock) {
      this.masterService.updateStock(this.selectedStock.id, this.stockData)
        .subscribe(() => this.loadstock());
    }
    this.showModal = false;

  }

  // ✅ Delete
  deleteStock(id: number) {
    if (confirm('Are you sure you want to delete this stock?')) {
      this.masterService.deleteStock(id).subscribe(() => {
        this.loadstock();
      });
    }
  }

}