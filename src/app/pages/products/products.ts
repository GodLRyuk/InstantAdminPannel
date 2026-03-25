import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ProductModel } from '../../models/products.model';
import { MasterService } from '../../services/auth.service';

@Component({
  selector: 'app-products',
  standalone: false,
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class Products implements OnInit{
  products: ProductModel[] = [];
  showModal = false;
  modalType: 'add' | 'edit' = 'add';
  selectedProduct: ProductModel | null = null;
  productName = '';
  product: ProductModel = this.getEmptyProduct();
  categories: any[] = [];
  subcategories: any[] = [];
  filteredSubcategories: any[] = [];
  units: any[] = [];
  brands: any[] = [];
  constructor(
    private masterService: MasterService,
    private cdf: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();
    this.loadSubcategories();
    this.loadUnits(); 
    this.loadBrands(); 
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
loadBrands() {
  this.masterService.getAllBrands().subscribe({
    next: (res: any) => {
      this.brands = res;
    },
    error: err => console.error(err)
  });
}
loadSubcategories() {
  this.masterService.getAllCatforSub().subscribe({
    next: (res: any) => {
      this.subcategories = res;
      this.filteredSubcategories = res; // initial
    },
    error: err => console.error(err)
  });
}
loadCategories() {
  this.masterService.getAllCat().subscribe({
    next: (res: any) => {
      this.categories = res;
    },
    error: err => console.error(err)
  });
}
onCategoryChange() {
  this.filteredSubcategories = this.subcategories.filter(
    sub => sub.category_id === this.product.category
  );

  // reset selected subcategory
  this.product.subcategory = 0;
}
loadUnits() {
  this.masterService.getAllunits().subscribe({
    next: (res: any) => {
      this.units = res;
    },
    error: err => console.error(err)
  });
}

  openAddModal() {
  this.modalType = 'add';
  this.product = this.getEmptyProduct();
  this.showModal = true;
}
getEmptyProduct(): ProductModel {
  return {
    id: 0,
    name: '',
    price: '0',
    discount_percent: '0',
    description: '',
    image: null,
    is_active: true,
    created_at: '',
    category: 0,
    subcategory: 0,
    brand: null,
    unit: 0
  };
}

  openEditModal(product: ProductModel) {
    this.modalType = 'edit';
    this.selectedProduct = product;
    this.productName = product.name;
    this.showModal = true;
  }

  save() {
    if (this.modalType === 'add') {
      console.log('Sending product:', this.product); // 👈 debug

      this.masterService.addProduct(this.product).subscribe({
        next: () => {
          this.loadProducts();
          this.showModal = false;
        },
        error: err => console.error(err)
      });
    }
  }

  deleteProduct(id: number) {
    if (confirm('Are you sure you want to delete this product?')) {
      this.masterService.deleteproduct(id).subscribe(() => this.loadProducts());
      this.cdf.detectChanges();
    }
  }
}
