import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MasterService } from '../../services/auth.service';
import { SubCategoryModel } from '../../models/sub-category.model';

@Component({
  selector: 'app-subcategory',
  standalone: false,
  templateUrl: './subcategory.html',
  styleUrls: ['./subcategory.css'],
})
export class Subcategory implements OnInit {

  cats: SubCategoryModel[] = [];
  filteredCats: SubCategoryModel[] = [];
  pagedCats: SubCategoryModel[] = [];
  category: any[] = [];

  showModal = false;
  modalType: 'add' | 'edit' = 'add';
  subCategory: SubCategoryModel = new SubCategoryModel();

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
    this.loadSubCategories();
    this.getAllCatforSub();
  }

  getAllCatforSub() {
    this.masterService.getAllCatforSub().subscribe({
      next: (res: any) => {
        this.category = res;
        this.cdf.detectChanges();
      },
      error: err => console.error('Error loading categories', err)
    });
  }

  loadSubCategories() {
    this.masterService.getAllSubCat().subscribe({
      next: data => {
        this.cats = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          categoryId: item.category,
          categoryName: item.category_name
        }));
        this.applyFilter();
        this.cdf.detectChanges();
      },
      error: err => console.error('Error loading SubCategory', err)
    });
  }

  // Search
  onSearch() {
    this.currentPage = 1;
    this.applyFilter();
  }

  applyFilter() {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredCats = term
      ? this.cats.filter(c =>
          c.name.toLowerCase().includes(term) ||
          (c.categoryName || '').toLowerCase().includes(term)
        )
      : this.cats;

    this.totalPages = Math.max(1, Math.ceil(this.filteredCats.length / this.pageSize));
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    this.updatePagedCats();
  }

  // Pagination
  updatePagedCats() {
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedCats = this.filteredCats.slice(start, start + this.pageSize);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.updatePagedCats();
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  openAddModal() {
    this.modalType = 'add';
    this.subCategory = new SubCategoryModel();
    this.showModal = true;
  }

  openEditModal(cat: any) {
    this.modalType = 'edit';
    this.subCategory = {
      id: cat.id,
      name: cat.name,
      categoryId: Number(cat.categoryId)
    };
    this.showModal = true;
  }

  save() {
    if (!this.subCategory.name || !this.subCategory.categoryId) {
      alert('Please fill all fields');
      return;
    }
    const payload = {
      name: this.subCategory.name,
      category: this.subCategory.categoryId
    };
    if (this.modalType === 'add') {
      this.masterService.addSubCat(payload)
        .subscribe(() => this.loadSubCategories());
    } else {
      this.masterService.updateSubCat(
        this.subCategory.id!,
        payload
      ).subscribe(() => this.loadSubCategories());
    }

    this.showModal = false;
  }

  deleteCat(id: number) {
    if (confirm('Are you sure you want to delete this sub category?')) {
      this.masterService.deleteSubCat(id)
        .subscribe(() => this.loadSubCategories());
    }
  }
}