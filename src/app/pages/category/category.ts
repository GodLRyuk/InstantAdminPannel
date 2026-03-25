import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CategoryModel } from '../../models/category.model';
import { MasterService } from '../../services/auth.service';

@Component({
  selector: 'app-category',
  standalone: false,
  templateUrl: './category.html',
  styleUrl: './category.css',
})
export class Category implements OnInit {

  cats: CategoryModel[] = [];
  showModal = false;
  modalType: 'add' | 'edit' = 'add';
  selectedCategory: CategoryModel | null = null;
  catName = '';

  constructor(
    private masterService: MasterService,
    private cdf: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadCat();
  }
  loadCat() {
    this.masterService.getAllCat().subscribe({
      
      next: data => {
        this.cats = [...data];
        this.cdf.detectChanges();
      },
      error: err => console.error('Error loading Category', err)
    });
  }

  openAddModal() {
      this.modalType = 'add';
      this.selectedCategory = null;
      this.catName = '';
      this.showModal = true;
    }
  
    openEditModal(unit: CategoryModel) {
      this.modalType = 'edit';
      this.selectedCategory = unit;
      this.catName = unit.name;
      this.showModal = true;
    }

     save() {
    if (this.modalType === 'add') {
      this.masterService.addCat({ name: this.catName})
        .subscribe(() => this.loadCat());
    } else if (this.modalType === 'edit' && this.selectedCategory) {
      this.masterService.updateCat(this.selectedCategory.id, { name: this.catName})
        .subscribe(() => this.loadCat());
    }
    this.showModal = false;
  }

  deleteCat(id: number) {
    if (confirm('Are you sure you want to delete this units?')) {
      this.masterService.deleteCat(id).subscribe(() => this.loadCat());
      this.cdf.detectChanges();
    }
  }
}