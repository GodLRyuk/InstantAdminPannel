import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { BrandModel } from '../../models/brand.model'; // ✅ import model
import { MasterService } from '../../services/auth.service';

@Component({
  selector: 'app-brand',
  templateUrl: './brand.html',
  standalone: false,
  styleUrls: ['./brand.css']
})
export class Brand implements OnInit {

  brands: BrandModel[] = [];
  showModal = false;
  modalType: 'add' | 'edit' = 'add';
  selectedBrand: BrandModel | null = null;
  brandName = '';

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
      this.cdf.detectChanges();
    },
    error: err => console.error('Error loading brands', err)
  });
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
      this.cdf.detectChanges();
    }
  }

}