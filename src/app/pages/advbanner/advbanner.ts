import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { advBannerModel } from '../../models/advbanner.model';
import { MasterService } from '../../services/auth.service';

@Component({
  selector: 'app-advbanner',
  standalone: false,
  templateUrl: './advbanner.html',
  styleUrl: './advbanner.css',
})
export class Advbanner implements OnInit {

  advbrands: advBannerModel[] = [];
  showModal = false;
  modalType: 'add' | 'edit' = 'add';
  selectedBanner: advBannerModel | null = null;
  imageFile!: File;
  imagePreview: string | null = null;
  onFileSelected(event: any) {
    this.imageFile = event.target.files[0];
    if (this.imageFile) {
      const reader = new FileReader();
      reader.onload = e => this.imagePreview = reader.result as string; // base64 URL
      reader.readAsDataURL(this.imageFile);
    }
  }
  constructor(
    private masterService: MasterService,
    private cdf: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadAdvBrands();
  }

  loadAdvBrands() {
    this.masterService.getAdvBanners().subscribe({
      next: (data: any) => {
        this.advbrands = data;
        this.cdf.detectChanges();
      },
      error: err => console.error('Error loading advbrands', err)
    });
  }

  openAddModal() {
    this.modalType = 'add';
    this.selectedBanner = null;
    this.showModal = true;
  }

  openEditModal(advbrand: advBannerModel) {
    this.modalType = 'edit';
    this.selectedBanner = advbrand;
    this.showModal = true;
  }

  save() {


    const bannerData: Partial<advBannerModel> = {
      is_active: true
    };

    if (this.modalType === 'add') {
      // Pass data and imageFile separately
      this.masterService.addAdvBanner(bannerData, this.imageFile).subscribe({
        next: () => {
          this.loadAdvBrands();
          this.showModal = false;
        },
        error: err => console.error('Error adding banner', err)
      });
    } else if (this.modalType === 'edit' && this.selectedBanner) {
      this.masterService.updateAdvBanner(this.selectedBanner.id!, bannerData, this.imageFile).subscribe({
        next: () => {
          this.loadAdvBrands();
          this.showModal = false;
        },
        error: err => console.error('Error updating banner', err)
      });
    }
  }

  deleteAdvBanner(id: number) {
    if (confirm('Are you sure you want to delete this brand?')) {
      this.masterService.deleteBrand(id).subscribe(() => this.loadAdvBrands());
      this.cdf.detectChanges();
    }
  }

}
