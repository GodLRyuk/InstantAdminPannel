import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { BannerModel } from '../../models/banner.model';
import { MasterService } from '../../services/auth.service';

@Component({
  selector: 'app-banner',
  standalone: false,
  templateUrl: './banner.html',
  styleUrls: ['./banner.css'],
})
export class BannerComponent implements OnInit {

  banners: BannerModel[] = [];
  showModal = false;
  modalType: 'add' | 'edit' = 'add';
  selectedBanner: BannerModel | null = null;

  title: string = '';
  link: string = '';
  imageFile!: File;
  imagePreview: string | null = null;
  constructor(
    private masterService: MasterService,
    private cdf: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadBanners();
  }
  onFileSelected(event: any) {
  this.imageFile = event.target.files[0];
  if (this.imageFile) {
    const reader = new FileReader();
    reader.onload = e => this.imagePreview = reader.result as string; // base64 URL
    reader.readAsDataURL(this.imageFile);
  }
}

  loadBanners() {
    this.masterService.getBanners().subscribe({
      next: (data: BannerModel[]) => {
        this.banners = data;
        this.cdf.detectChanges();
      },
      error: err => console.error('Error loading banners', err)
    });
  }

  openAddModal() {
    this.modalType = 'add';
    this.selectedBanner = null;
    this.title = '';
    this.link = '';
    this.imageFile = null!;
    this.showModal = true;
  }

  openEditModal(banner: BannerModel) {
    this.modalType = 'edit';
    this.selectedBanner = banner;
    this.title = banner.title;
    this.link = banner.link || '';
    this.showModal = true;
  }

  save() {
    if (!this.title) {
      alert('Title is required');
      return;
    }

    const bannerData: Partial<BannerModel> = {
      title: this.title,
      link: this.link,
      is_active: true
    };

    if (this.modalType === 'add') {
      // Pass data and imageFile separately
      this.masterService.addBanner(bannerData, this.imageFile).subscribe({
        next: () => {
          this.loadBanners();
          this.showModal = false;
        },
        error: err => console.error('Error adding banner', err)
      });
    } else if (this.modalType === 'edit' && this.selectedBanner) {
      this.masterService.updateBanner(this.selectedBanner.id!, bannerData, this.imageFile).subscribe({
        next: () => {
          this.loadBanners();
          this.showModal = false;
        },
        error: err => console.error('Error updating banner', err)
      });
    }
  }

  deleteBanner(id: number) {
    if (!id) return;
    if (confirm('Are you sure you want to delete this banner?')) {
      this.masterService.deleteBanner(id).subscribe(() => this.loadBanners());
      this.cdf.detectChanges();
    }
  }
}