import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { BrandModel } from '../../models/brand.model';
import { MasterService } from '../../services/auth.service';

@Component({
  selector: 'app-brand',
  templateUrl: './brand.html',
  standalone: false,
  styleUrls: ['./brand.css']
})
export class Brand implements OnInit {

  brands: BrandModel[] = [];
  filteredBrands: BrandModel[] = [];
  pagedBrands: BrandModel[] = [];

  showModal = false;
  modalType: 'add' | 'edit' = 'add';
  selectedBrand: BrandModel | null = null;
  brandName = '';

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
    this.loadBrands();
  }

  loadBrands() {
    this.masterService.getAllBrands().subscribe({
      next: (data: any) => {
        this.brands = data;
        this.applyFilter();
        this.cdf.detectChanges();
      },
      error: err => console.error('Error loading brands', err)
    });
  }

  // Search
  onSearch() {
    this.currentPage = 1;
    this.applyFilter();
  }

  applyFilter() {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredBrands = term
      ? this.brands.filter(b => b.name.toLowerCase().includes(term))
      : this.brands;

    this.totalPages = Math.max(1, Math.ceil(this.filteredBrands.length / this.pageSize));
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    this.updatePagedBrands();
  }

  // Pagination
  updatePagedBrands() {
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedBrands = this.filteredBrands.slice(start, start + this.pageSize);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.updatePagedBrands();
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  openAddModal() {
    this.modalType = 'add';
    this.selectedBrand = null;
    this.brandName = '';
    this.showModal = true;
  }

  openEditModal(brand: BrandModel) {
    this.modalType = 'edit';
    this.selectedBrand = brand;
    this.brandName = brand.name;
    this.showModal = true;
  }

  save() {
    if (this.modalType === 'add') {
      this.masterService.addBrand({ name: this.brandName, status: 'Active' })
        .subscribe(() => this.loadBrands());
    } else if (this.modalType === 'edit' && this.selectedBrand) {
      this.masterService.updateBrand(this.selectedBrand.id, { name: this.brandName })
        .subscribe(() => this.loadBrands());
    }
    this.showModal = false;
  }

  deleteBrand(id: number) {
    if (confirm('Are you sure you want to delete this brand?')) {
      this.masterService.deleteBrand(id).subscribe(() => this.loadBrands());
    }
  }

}