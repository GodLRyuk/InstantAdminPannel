import { ChangeDetectorRef, Component } from '@angular/core';
import { MasterService } from '../../services/auth.service';

@Component({
  selector: 'app-brand-products-report',
  standalone: false,
  templateUrl: './brand-products-report.html',
  styleUrls: ['./brand-products-report.css']
})
export class BrandProductsReport {
  isLoading = false;
  downloadError = '';

  constructor(private masterService: MasterService, private cdf: ChangeDetectorRef) {}

  exportBrandProducts() {
    this.isLoading = true;
    this.downloadError = '';

    this.masterService.downloadBrandProductsReport().subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'brand_products.xlsx';
        link.click();
        window.URL.revokeObjectURL(url);
        this.isLoading = false;
        this.cdf.detectChanges();
      },
      error: (err) => {
        console.error('Brand products export failed', err);
        this.downloadError = 'Unable to download the report. Please try again.';
        this.isLoading = false;
        this.cdf.detectChanges();
      }
    });
  }
}
