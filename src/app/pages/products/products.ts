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
      unit: 0,
      unit_size: null,
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
formData.append('is_active', String(this.product.is_active)); // boolean → string

if (this.selectedFile) {
  formData.append('image', this.selectedFile);
}
    this.masterService.addProduct(formData).subscribe({
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
