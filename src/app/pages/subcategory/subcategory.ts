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

  // ✅ FIXED: Use model, not component
  cats: SubCategoryModel[] = [];
  category: any[] = [];

  showModal = false;
  modalType: 'add' | 'edit' = 'add';

  // ✅ FIXED
  subCategory: SubCategoryModel = new SubCategoryModel();

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
      this.category = res; // 👈 IMPORTANT

      this.cdf.detectChanges();
    },
    error: err => console.error('Error loading categories', err)
  });
}
  // ✅ Load Sub Categories
  loadSubCategories() {
  this.masterService.getAllSubCat().subscribe({
    next: data => {
      this.cats = data.map((item: any) => ({
        id: item.id,
        name: item.name,
        categoryId: item.category,     // ✅ mapping fixed
        categoryName: item.category_name       // ✅ mapping fixed
      }));

      this.cdf.detectChanges();
    },
    error: err => console.error('Error loading SubCategory', err)
  });
}
  


  // ✅ Open Add Modal
  openAddModal() {
    this.modalType = 'add';
    this.subCategory = new SubCategoryModel(); // ✅ FIXED
    this.showModal = true;
  }

  // ✅ Open Edit Modal
  openEditModal(cat: any) {
  this.modalType = 'edit';

  this.subCategory = {
    id: cat.id,
    name: cat.name,
    categoryId: Number(cat.categoryId) // ✅ FORCE NUMBER
  };

  this.showModal = true;
}

  // ✅ Save
  save() {

    if (!this.subCategory.name || !this.subCategory.categoryId) {
      alert('Please fill all fields');
      return;
    }
    const payload = {
        name: this.subCategory.name,
        category: this.subCategory.categoryId   // ✅ FIX
      };
    if (this.modalType === 'add') {
      this.masterService.addSubCat(payload)
        .subscribe(() => this.loadSubCategories());

    } else {
      this.masterService.updateSubCat(
      this.subCategory.id!,
      payload   // ✅ send fixed payload
    ).subscribe(() => this.loadSubCategories());
    }

    this.showModal = false;
  }

  // ✅ Delete
  deleteCat(id: number) {
    if (confirm('Are you sure you want to delete this sub category?')) {
      this.masterService.deleteSubCat(id)
        .subscribe(() => this.loadSubCategories());
    }
  }
}