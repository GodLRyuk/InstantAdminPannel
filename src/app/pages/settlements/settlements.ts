import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { DriverSettlementSummary, PendingCashOrder } from '../../models/settlements.model';
import { MasterService } from '../../services/auth.service';

@Component({
  selector: 'app-settlements',
  standalone: false,
  templateUrl: './settlements.html',
  styleUrl: './settlements.css'
})
export class Settlements implements OnInit {
  drivers: DriverSettlementSummary[] = [];
  selectedDriverId: number | null = null;
  selectedDriverName: string = '';
  driverOrders: PendingCashOrder[] = [];
  selectedOrderIds: Set<number> = new Set();

  amountReceived: number | null = null;
  notes: string = '';

  loading = false;
  submitting = false;
  errorMsg = '';
  successMsg = '';

  constructor(
    private masterService: MasterService,
    private cdf: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadPendingSettlements();
  }


  openDriver(driver: DriverSettlementSummary): void {
    this.selectedDriverId = driver.deliveryassignment__driver__id;
    this.selectedDriverName = driver.deliveryassignment__driver__username;
    this.selectedOrderIds.clear();
    this.amountReceived = null;
    this.notes = '';
    this.errorMsg = '';
    this.successMsg = '';

    this.masterService.getDriverPendingOrders(this.selectedDriverId).subscribe({
      next: (res: { orders: PendingCashOrder[]; total_due: number }) => {
        this.driverOrders = res.orders;
        // default: select all — matches the "settle everything" default we discussed
        this.driverOrders.forEach(o => this.selectedOrderIds.add(o.order_id));
        this.updateAmountFromSelection();
      },
      error: () => {
        this.errorMsg = 'Failed to load driver orders';
      }
    });
  }

  toggleOrder(orderId: number): void {
    if (this.selectedOrderIds.has(orderId)) {
      this.selectedOrderIds.delete(orderId);
    } else {
      this.selectedOrderIds.add(orderId);
    }
    this.updateAmountFromSelection();
  }

  updateAmountFromSelection(): void {
    const total = this.driverOrders
      .filter(o => this.selectedOrderIds.has(o.order_id))
      .reduce((sum, o) => sum + Number(o.total_amount), 0);
    this.amountReceived = total;
  }

  get selectedTotal(): number {
    return this.driverOrders
      .filter(o => this.selectedOrderIds.has(o.order_id))
      .reduce((sum, o) => sum + Number(o.total_amount), 0);
  }

  closeDriverPanel(): void {
    this.selectedDriverId = null;
    this.driverOrders = [];
  }

  submitSettlement(): void {
  if (this.submitting) return;
  if (!this.selectedDriverId || this.selectedOrderIds.size === 0 || this.amountReceived === null) {
    this.errorMsg = 'Select at least one order and enter the amount received';
    return;
  }
  this.submitting = true;
  this.errorMsg = '';
  this.successMsg = '';

  this.masterService.recordRemittance({
    driver_id: this.selectedDriverId,
    order_ids: Array.from(this.selectedOrderIds),
    amount_received: this.amountReceived,
    notes: this.notes
  }).subscribe({
    next: (res: any) => {
      console.log('SETTLE OK:', res);
      this.submitting = false;
      this.successMsg = res.status === 'DISCREPANCY'
        ? `Mismatch — expected ₹${this.selectedTotal}, got ₹${this.amountReceived}`
        : 'Settlement recorded';
      this.closeDriverPanel();
      this.loadPendingSettlements();
    },
    error: (err) => {
      console.error('SETTLE FAIL:', err);
      this.submitting = false;
      this.errorMsg = err?.error?.error || 'Failed to record settlement';
    }
  });
}

loadPendingSettlements(): void {
  this.loading = true;
  console.log('FETCHING PENDING...');
  this.masterService.getPendingSettlements().subscribe({
    next: (res: DriverSettlementSummary[]) => {
      console.log('PENDING OK:', res);
      this.drivers = res;
      this.loading = false;
      this.cdf.detectChanges();   // 👈 force repaint
    },
    error: (err) => {
      console.error('PENDING FAIL:', err);
      this.errorMsg = 'Failed to load pending settlements';
      this.loading = false;
      this.cdf.detectChanges();   // 👈 same here
    }
  });
}
}