import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ProductModel } from '../../models/products.model';
import { MasterService } from '../../services/auth.service';

@Component({
  selector: 'app-products',
  standalone: false,
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class Products implements OnInit {
  products: ProductModel[] = [];
  filteredProducts: ProductModel[] = [];
  pagedProducts: ProductModel[] = [];

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
  selectedFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;

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
        this.applyFilter();
        this.cdf.detectChanges();
      },
      error: err => console.error('Error loading products', err)
    });
  }

  // Search
  onSearch() {
    this.currentPage = 1;
    this.applyFilter();
  }

  applyFilter() {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredProducts = term
      ? this.products.filter(p => p.name.toLowerCase().includes(term))
      : this.products;

    this.totalPages = Math.max(1, Math.ceil(this.filteredProducts.length / this.pageSize));
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    this.updatePagedProducts();
  }

  // Pagination
  updatePagedProducts() {
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedProducts = this.filteredProducts.slice(start, start + this.pageSize);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.updatePagedProducts();
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
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
    this.masterService.getAllSubCat().subscribe({
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
  console.log('product.category:', this.product.category, typeof this.product.category);
  console.log('all subcategories:', this.subcategories);

  this.filteredSubcategories = this.subcategories.filter(
    sub => sub.category === this.product.category
  );

  console.log('filteredSubcategories result:', this.filteredSubcategories);
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
  this.selectedFile = null;
  this.imagePreview = null;
  this.filteredSubcategories = this.subcategories;
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
      unit: 0,
      unit_size: null,
    };
  }

  openEditModal(product: ProductModel) {
  this.modalType = 'edit';
  this.selectedProduct = product;
  this.product = { ...product };
  this.selectedFile = null;
  this.imagePreview = product.image || null;

  this.filteredSubcategories = this.subcategories.filter(
    sub => sub.category_id === this.product.category
  );

  this.showModal = true;
}

  save() {
  const formData = new FormData();

  formData.append('name', String(this.product.name));
  formData.append('price', String(this.product.price));
  formData.append('discount_percent', String(this.product.discount_percent));
  formData.append('description', String(this.product.description));
  formData.append('category', String(this.product.category));
  formData.append('subcategory', String(this.product.subcategory));
  formData.append('unit', String(this.product.unit));
  formData.append('unit_size', String(this.product.unit_size));
  formData.append('brand', String(this.product.brand));
  formData.append('is_active', String(this.product.is_active));

  if (this.selectedFile) {
    formData.append('image', this.selectedFile);
  }

  if (this.modalType === 'add') {
    this.masterService.addProduct(formData).subscribe({
      next: () => {
        this.loadProducts();
        this.showModal = false;
      },
      error: err => console.error(err)
    });
  } else {
    this.masterService.updateProduct(this.product.id, formData).subscribe({
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
    }
  }
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;

      // Preview
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }
}