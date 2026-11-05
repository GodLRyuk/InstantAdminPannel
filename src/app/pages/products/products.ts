import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ProductModel } from '../../models/products.model';
import { MasterService } from '../../services/auth.service';
import { getVisiblePageNumbers } from '../../shared/pagination';

@Component({
  selector: 'app-products',
  standalone: false,
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class Products implements OnInit {
  openDropdown: 'brand' | 'category' | 'subcategory' | 'unit' | null = null;
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
  brandSearchTerm = '';
  categorySearchTerm = '';
  subcategorySearchTerm = '';
  unitSearchTerm = '';
  selectedFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;
  saving = false;
  generatingBarcode = false;
  barcodeGenerationError = '';
  private barcodeGenerationRequest = 0;

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

  // Search (name or barcode)
  onSearch() {
    this.currentPage = 1;
    this.applyFilter();
  }

  applyFilter() {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredProducts = term
      ? this.products.filter(p =>
          p.name.toLowerCase().includes(term) ||
          (p.barcode ?? '').toLowerCase().includes(term)
        )
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
    return getVisiblePageNumbers(this.currentPage, this.totalPages);
  }

  get filteredBrands(): any[] {
    return this.filterDropdownOptions(this.brands, this.brandSearchTerm);
  }

  get filteredCategories(): any[] {
    return this.filterDropdownOptions(this.categories, this.categorySearchTerm);
  }

  get searchedSubcategories(): any[] {
    return this.filterDropdownOptions(this.filteredSubcategories, this.subcategorySearchTerm);
  }

  get filteredUnits(): any[] {
    return this.filterDropdownOptions(this.units, this.unitSearchTerm);
  }

  dropdownLabel(options: any[], selectedId: number | null, placeholder: string): string {
    return options.find(option => option.id === selectedId)?.name ?? placeholder;
  }

  toggleDropdown(dropdown: 'brand' | 'category' | 'subcategory' | 'unit'): void {
    this.openDropdown = this.openDropdown === dropdown ? null : dropdown;
  }

  selectBrand(id: number): void {
    this.product.brand = id;
    this.brandSearchTerm = '';
    this.openDropdown = null;
  }

  selectCategory(id: number): void {
    this.product.category = id;
    this.onCategoryChange();
    this.categorySearchTerm = '';
    this.openDropdown = null;
  }

  selectSubcategory(id: number): void {
    this.product.subcategory = id;
    this.subcategorySearchTerm = '';
    this.openDropdown = null;
  }

  selectUnit(id: number): void {
    this.product.unit = id;
    this.unitSearchTerm = '';
    this.openDropdown = null;
  }

  private filterDropdownOptions(options: any[], searchTerm: string): any[] {
    const term = searchTerm.trim().toLowerCase();
    return term
      ? options.filter(option => String(option.name ?? '').toLowerCase().includes(term))
      : options;
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
        if (this.showModal && this.modalType === 'edit') {
          this.syncEditSubcategory();
        } else {
          this.filteredSubcategories = res;
        }
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
    this.subcategorySearchTerm = '';
    this.filteredSubcategories = this.getSubcategoriesForCategory(this.product.category);
    this.product.subcategory = 0;
  }

  private getSubcategoriesForCategory(categoryId: number): any[] {
    return this.subcategories.filter(
      sub => this.getSubcategoryCategoryId(sub) === Number(categoryId)
    );
  }

  private getSubcategoryCategoryId(subcategory: any): number | null {
    const category = subcategory.category ?? subcategory.category_id ?? subcategory.categoryId;
    const id = typeof category === 'object' && category !== null ? category.id : category;
    const categoryId = Number(id);
    return Number.isFinite(categoryId) ? categoryId : null;
  }

  private syncEditSubcategory(): void {
    const selectedId = Number(this.product.subcategory_id ?? this.product.subcategory);
    const selectedSubcategory = this.subcategories.find(
      subcategory => Number(subcategory.id) === selectedId
    );

    this.filteredSubcategories = this.getSubcategoriesForCategory(this.product.category);
    if (selectedSubcategory) {
      this.product.subcategory = Number(selectedSubcategory.id);
      if (!this.filteredSubcategories.some(subcategory => Number(subcategory.id) === selectedId)) {
        this.filteredSubcategories = [...this.filteredSubcategories, selectedSubcategory];
      }
    }
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
    this.barcodeGenerationRequest++;
    this.product = this.getEmptyProduct();
    this.generatingBarcode = false;
    this.barcodeGenerationError = '';
    this.selectedFile = null;
    this.imagePreview = null;
    this.resetDropdownSearches();
    this.filteredSubcategories = this.subcategories;
    this.showModal = true;
  }

  private resetDropdownSearches(): void {
    this.brandSearchTerm = '';
    this.categorySearchTerm = '';
    this.subcategorySearchTerm = '';
    this.unitSearchTerm = '';
    this.openDropdown = null;
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
      barcode: '',
    };
  }

  openEditModal(product: ProductModel) {
    this.modalType = 'edit';
    this.barcodeGenerationRequest++;
    this.selectedProduct = product;
    this.product = { ...product, barcode: product.barcode ?? '' };
    this.generatingBarcode = false;
    this.barcodeGenerationError = '';
    this.product.subcategory = Number(product.subcategory_id ?? product.subcategory) || 0;
    this.selectedFile = null;
    this.imagePreview = product.image || null;
    this.resetDropdownSearches();

    this.syncEditSubcategory();

    this.showModal = true;
  }

  generateBarcode(): void {
    if (this.generatingBarcode || this.product.barcode?.trim()) return;

    const requestId = ++this.barcodeGenerationRequest;
    this.generatingBarcode = true;
    this.barcodeGenerationError = '';

    this.masterService.generateBarcode().subscribe({
      next: response => {
        if (this.barcodeGenerationRequest === requestId) {
          if (this.showModal && !this.product.barcode?.trim()) {
            if (response?.barcode?.trim()) {
              this.product.barcode = response.barcode;
            } else {
              this.barcodeGenerationError = 'The barcode service returned an empty barcode.';
            }
          }
          this.generatingBarcode = false;
        }
      },
      error: err => {
        console.error('Error generating barcode', err);
        if (this.barcodeGenerationRequest === requestId) {
          this.barcodeGenerationError = 'Unable to generate barcode. Please try again.';
          this.generatingBarcode = false;
        }
      }
    });
  }

  save() {
    if (this.saving) return;

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
    formData.append('barcode', (this.product.barcode ?? '').toString().trim());

    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    this.saving = true;
    const request = this.modalType === 'add'
      ? this.masterService.addProduct(formData)
      : this.masterService.updateProduct(this.product.id, formData);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.loadProducts();
        this.showModal = false;
      },
      error: err => {
        console.error(err);
        this.saving = false;
      }
    });
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