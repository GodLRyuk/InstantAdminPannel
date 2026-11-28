import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorService } from '../../services/api-error.service';
import { ProductModel } from '../../models/products.model';
import { MasterService } from '../../services/auth.service';
import { getVisiblePageNumbers } from '../../shared/pagination';

const comboFields = ['is_combo', 'combo_buy_qty', 'combo_free_qty', 'combo_price', 'combo_repeat'] as const;
type ComboField = (typeof comboFields)[number];
type ComboErrors = Partial<Record<ComboField, string>>;

@Component({
  selector: 'app-products',
  standalone: false,
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class Products implements OnInit {
  private readonly upcLeftPatterns = [
    '0001101', '0011001', '0010011', '0111101', '0100011',
    '0110001', '0101111', '0111011', '0110111', '0001011',
  ];
  private readonly upcRightPatterns = [
    '1110010', '1100110', '1101100', '1000010', '1011100',
    '1001110', '1010000', '1000100', '1001000', '1110100',
  ];
  private readonly eanParity = [
    'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
    'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL',
  ];
  private readonly eanLeftGPatterns = [
    '0100111', '0110011', '0011011', '0100001', '0011101',
    '0111001', '0000101', '0010001', '0001001', '0010111',
  ];
  openDropdown: 'brand' | 'category' | 'subcategory' | 'unit' | null = null;
  products: ProductModel[] = [];
  filteredProducts: ProductModel[] = [];
  pagedProducts: ProductModel[] = [];

  showModal = false;
  modalType: 'add' | 'edit' = 'add';
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
  saveError = '';
  loadingProduct = false;
  productLoadError = '';
  comboErrors: ComboErrors = {};
  private readonly comboPriceFormat = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  generatingBarcode = false;
  barcodeGenerationError = '';
  private barcodeGenerationRequest = 0;
  private generatedDraftBarcode = '';
  private readonly generatedBarcodes = new Map<number, string>();

  // Search
  searchTerm = '';

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  constructor(
    private masterService: MasterService,
    private cdf: ChangeDetectorRef,
    private apiErrorService: ApiErrorService
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
        for (const product of this.products) {
          if (this.generatedBarcodes.has(product.id)) continue;
          try {
            const value = localStorage.getItem(this.generatedBarcodeKey(product.id));
            if (value) this.generatedBarcodes.set(product.id, value);
          } catch {
            break;
          }
        }
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
    this.generatedDraftBarcode = '';
    this.generatingBarcode = false;
    this.barcodeGenerationError = '';
    this.saveError = '';
    this.loadingProduct = false;
    this.productLoadError = '';
    this.comboErrors = {};
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
      is_combo: false,
      combo_buy_qty: null,
      combo_free_qty: null,
      combo_price: null,
      combo_repeat: true,
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
    const draft = this.getEmptyProduct();
    this.product = draft;
    this.generatingBarcode = false;
    this.barcodeGenerationError = '';
    this.saveError = '';
    this.comboErrors = {};
    this.loadingProduct = true;
    this.productLoadError = '';
    this.selectedFile = null;
    this.imagePreview = null;
    this.resetDropdownSearches();
    this.showModal = true;

    this.masterService.getProduct(product.id).subscribe({
      next: detail => {
        if (!this.showModal || this.product !== draft) return;
        this.product = { ...draft, ...detail, barcode: detail.barcode ?? '' };
        this.product.subcategory = Number(detail.subcategory_id ?? detail.subcategory) || 0;
        this.imagePreview = detail.image || null;
        this.syncEditSubcategory();
        this.loadingProduct = false;
        this.cdf.detectChanges();
      },
      error: err => {
        if (!this.showModal || this.product !== draft) return;
        this.loadingProduct = false;
        this.productLoadError = this.apiErrorService.getMessage(err);
        this.cdf.detectChanges();
      }
    });
  }

  private validateCombo(): ComboErrors {
    const errors: ComboErrors = {};
    const { combo_buy_qty, combo_free_qty, combo_price } = this.product;
    if (combo_buy_qty == null || !Number.isSafeInteger(combo_buy_qty) || combo_buy_qty < 1) {
      errors.combo_buy_qty = 'Enter a whole number of at least 1.';
    }
    if (combo_free_qty == null || !Number.isSafeInteger(combo_free_qty) || combo_free_qty < 0) {
      errors.combo_free_qty = 'Enter a whole number of at least 0.';
    }
    const price = combo_price?.trim() ?? '';
    if (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(price) || !Number.isFinite(Number(price)) || Number(price) <= 0) {
      errors.combo_price = 'Enter a positive rupee amount with up to two decimal places.';
    }
    return errors;
  }

  get comboPreview(): string {
    if (!this.product.is_combo || Object.keys(this.validateCombo()).length) return '';
    const { combo_buy_qty, combo_free_qty, combo_price } = this.product;
    const pieces = Number(combo_buy_qty) + Number(combo_free_qty);
    return `Customer selects ${combo_buy_qty} · receives ${pieces} ${pieces === 1 ? 'piece' : 'pieces'} · pays ${this.comboPriceFormat.format(Number(combo_price))}`;
  }

  generateBarcode(): void {
    if (this.saving || this.generatingBarcode || this.product.barcode?.trim()) return;

    if (this.modalType === 'add') {
      this.generatedDraftBarcode = this.generateDraftBarcode();
      this.product.barcode = this.generatedDraftBarcode;
      this.barcodeGenerationError = '';
      this.saveError = '';
      return;
    }

    const requestId = ++this.barcodeGenerationRequest;
    this.generatingBarcode = true;
    this.barcodeGenerationError = '';

    this.masterService.generateBarcode(this.product.id).subscribe({
      next: response => {
        if (this.barcodeGenerationRequest !== requestId) return;
        this.generatingBarcode = false;
        const barcode = response?.barcode?.trim();
        if (barcode) {
          if (!this.product.barcode?.trim()) this.product.barcode = barcode;
          this.storeGeneratedBarcode(this.product.id, barcode);
          this.loadProducts();
        } else {
          this.barcodeGenerationError = 'The barcode service returned an empty barcode. Please try again.';
        }
        this.cdf.detectChanges();
      },
      error: err => {
        console.error('Error generating barcode', err);
        if (this.barcodeGenerationRequest !== requestId) return;
        this.generatingBarcode = false;
        this.barcodeGenerationError = 'Unable to generate barcode. Please try again.';
        this.cdf.detectChanges();
      }
    });
  }

  isSystemGeneratedBarcode(product: ProductModel): boolean {
    const barcode = product.barcode?.trim();
    return !!barcode && this.generatedBarcodes.get(product.id) === barcode;
  }

  private generatedBarcodeKey(id: number): string {
    return `instant-admin:generated-barcode:${id}`;
  }

  private storeGeneratedBarcode(id: number, barcode: string): void {
    if (barcode) this.generatedBarcodes.set(id, barcode);
    else this.generatedBarcodes.delete(id);

    try {
      const key = this.generatedBarcodeKey(id);
      if (barcode) localStorage.setItem(key, barcode);
      else localStorage.removeItem(key);
    } catch {
      // Keep the tag available on this page when browser storage is unavailable.
    }
  }

  private generateDraftBarcode(): string {
    // Prefix 20 is reserved for barcodes used within a restricted distribution area.
    const existingBarcodes = new Set(this.products.map(product => product.barcode?.trim()));
    const randomDigits = new Uint8Array(10);
    let barcode: string;
    do {
      crypto.getRandomValues(randomDigits);
      const digits = [2, 0, ...randomDigits.map(value => value % 10)];
      const sum = digits.reduce((total, digit, index) => total + digit * (index % 2 ? 3 : 1), 0);
      barcode = digits.join('') + ((10 - sum % 10) % 10);
    } while (existingBarcodes.has(barcode));
    return barcode;
  }

  save(): void {
    if (this.saving || this.generatingBarcode || this.loadingProduct || this.productLoadError) return;

    this.saveError = '';
    this.comboErrors = this.product.is_combo ? this.validateCombo() : {};
    if (Object.keys(this.comboErrors).length) return;
    const name = this.product.name.trim();
    if (!name) {
      this.saveError = 'Enter a product name.';
      return;
    }
    if (this.product.price == null || String(this.product.price).trim() === '') {
      this.saveError = 'Enter a price.';
      return;
    }

    const isNew = this.modalType === 'add';
    const barcode = this.product.barcode?.trim() ?? '';
    if (isNew && !barcode) {
      this.saveError = 'Scan, enter, or generate a barcode before saving.';
      return;
    }
    const formData = new FormData();
    formData.append('name', name);
    formData.append('price', String(this.product.price));
    formData.append('discount_percent', String(this.product.discount_percent ?? 0));
    formData.append('description', this.product.description ?? '');
    formData.append('category', String(this.product.category));
    if (this.product.subcategory || !isNew) {
      formData.append('subcategory', this.product.subcategory ? String(this.product.subcategory) : '');
    }
    if (this.product.unit || !isNew) {
      formData.append('unit', this.product.unit ? String(this.product.unit) : '');
    }
    if (this.product.unit_size != null || !isNew) {
      formData.append('unit_size', String(this.product.unit_size ?? ''));
    }
    if (this.product.brand != null || !isNew) {
      formData.append('brand', String(this.product.brand ?? ''));
    }
    formData.append('is_active', String(this.product.is_active));
    formData.append('is_combo', String(this.product.is_combo ?? false));
    if (this.product.is_combo) {
      formData.append('combo_buy_qty', String(this.product.combo_buy_qty));
      formData.append('combo_free_qty', String(this.product.combo_free_qty));
      const [rupees, paise = ''] = this.product.combo_price!.trim().split('.');
      formData.append('combo_price', `${rupees || '0'}.${paise.padEnd(2, '0')}`);
    }
    if (isNew || this.product.is_combo) {
      formData.append('combo_repeat', String(this.product.combo_repeat ?? true));
    }
    if (barcode || !isNew) formData.append('barcode', barcode);
    if (this.selectedFile) formData.append('image', this.selectedFile);

    this.saving = true;
    const request = isNew
      ? this.masterService.addProduct(formData)
      : this.masterService.updateProduct(this.product.id, formData);

    request.subscribe({
      next: response => {
        if (isNew && barcode === this.generatedDraftBarcode) {
          const saved = Array.isArray(response)
            ? response.find(product => product.barcode?.trim() === barcode)
            : response;
          if (saved?.id && saved.barcode?.trim() === barcode) {
            this.storeGeneratedBarcode(saved.id, barcode);
          }
        } else if (!isNew && this.generatedBarcodes.get(this.product.id) !== barcode) {
          this.storeGeneratedBarcode(this.product.id, '');
        }
        this.saving = false;
        this.showModal = false;
        this.loadProducts();
        this.cdf.detectChanges();
      },
      error: err => {
        if (err instanceof HttpErrorResponse && err.status === 400 && err.error && typeof err.error === 'object') {
          const remainingErrors = { ...err.error };
          for (const field of comboFields) {
            if (remainingErrors[field] == null) continue;
            this.comboErrors[field] = this.apiErrorService.getMessage(remainingErrors[field]);
            delete remainingErrors[field];
          }
          if (Object.keys(remainingErrors).length || !Object.keys(this.comboErrors).length) {
            this.saveError = this.apiErrorService.getMessage(remainingErrors);
          }
        } else {
          this.saveError = this.apiErrorService.getMessage(err);
        }
        this.saving = false;
        this.cdf.detectChanges();
      }
    });
  }

  get barcodeBars(): boolean[] {
    return this.getBarcodeBars(this.product.barcode);
  }

  getBarcodeBars(barcode: string | null | undefined): boolean[] {
    const value = (barcode ?? '').trim();
    if (/^\d{12}$/.test(value)) {
      return this.toBars(`101${value.slice(0, 6).split('').map(d => this.upcLeftPatterns[Number(d)]).join('')}01010${value.slice(6).split('').map(d => this.upcRightPatterns[Number(d)]).join('')}101`);
    }

    if (/^\d{13}$/.test(value)) {
      const firstDigit = Number(value[0]);
      const parity = this.eanParity[firstDigit];
      const left = value.slice(1, 7).split('').map((digit, index) => {
        const numericDigit = Number(digit);
        return parity[index] === 'G' ? this.eanLeftGPatterns[numericDigit] : this.upcLeftPatterns[numericDigit];
      }).join('');
      const right = value.slice(7).split('').map(digit => this.upcRightPatterns[Number(digit)]).join('');
      return this.toBars(`101${left}01010${right}101`);
    }

    return [];
  }

  private toBars(pattern: string): boolean[] {
    return pattern.split('').map(value => value === '1');
  }

  deleteProduct(id: number) {
    if (confirm('Are you sure you want to delete this product?')) {
      this.masterService.deleteproduct(id).subscribe(() => {
        this.storeGeneratedBarcode(id, '');
        this.loadProducts();
      });
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
