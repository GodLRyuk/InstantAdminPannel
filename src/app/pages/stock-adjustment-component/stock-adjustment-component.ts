import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { StockModel } from '../../models/stock.model';
import { StockAdjustmentModel } from '../../models/stock-adjustment.model';
import { MasterService } from '../../services/auth.service';

@Component({
  selector: 'app-stock-adjustment-component',
  standalone: false,
  templateUrl: './stock-adjustment-component.html',
  styleUrl: './stock-adjustment-component.css',
})
export class StockAdjustmentComponent implements OnInit {

  batches: StockModel[] = [];
  adjustments: StockAdjustmentModel[] = [];
  loading = false;
  showModal = false;

  form: Partial<StockAdjustmentModel> = {
    batch: undefined,
    adjust_type: 'OUT',
    reason: 'DAMAGE',
    quantity: 1,
    notes: ''
  };

  reasons = [
    { value: 'DAMAGE', label: 'Damaged' },
    { value: 'RETURN_TO_DEALER', label: 'Return to Dealer' },
    { value: 'EXPIRED', label: 'Expired' },
    { value: 'LOST', label: 'Lost / Theft' },
    { value: 'CORRECTION', label: 'Manual Correction' },
    { value: 'OTHER', label: 'Other' },
  ];

  constructor(private masterService: MasterService, private cdf: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadBatches();
    this.loadAdjustments();
  }

  loadBatches() {
    this.masterService.getAllstock().subscribe({
      next: (data: StockModel[]) => {
        this.batches = data;
        this.cdf.detectChanges();
      },
      error: err => console.error(err)
    });
  }

  loadAdjustments() {
    this.masterService.getStockAdjustments().subscribe({
      next: (data: any) => {
        this.adjustments = data.results ?? data;
        this.cdf.detectChanges();
      },
      error: err => console.error(err)
    });
  }

  openModal() {
    this.form = { batch: undefined, adjust_type: 'OUT', reason: 'DAMAGE', quantity: 1, notes: '' };
    this.showModal = true;
    this.cdf.detectChanges();
  }

  closeModal() {
    this.showModal = false;
    this.cdf.detectChanges();
  }

  submit() {
    if (!this.form.batch || !this.form.quantity || this.form.quantity <= 0) {
      return;
    }
    this.loading = true;
    this.masterService.addStockAdjustment(this.form).subscribe({
      next: () => {
        this.loading = false;
        this.showModal = false;
        this.loadBatches();
        this.loadAdjustments();
        this.cdf.detectChanges();
      },
      error: err => {
        this.loading = false;
        this.cdf.detectChanges();
        alert(err?.error?.quantity?.[0] || err?.error?.non_field_errors?.[0] || JSON.stringify(err?.error) || 'Adjustment failed');
      }
    });
  }
}