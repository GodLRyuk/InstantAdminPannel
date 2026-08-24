import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { StoreScheduleModel } from '../../models/store-schedule.model';
import { MasterService } from '../../services/auth.service';

@Component({
  selector: 'app-store-timing',
  standalone: false,
  templateUrl: './store-timing.html',
  styleUrls: ['./store-timing.css']
})
export class StoreTiming implements OnInit {

  schedule: StoreScheduleModel = {
    opens_at: '05:30',
    closes_at: '23:00',
    is_force_closed: false,
  };

  isOpenNow: boolean | null = null;
  loading = false;
  saving = false;
  saveMessage = '';

  constructor(
    private masterService: MasterService,
    private cdf: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadSchedule();
    this.loadStatus();
  }

  loadSchedule() {
    this.loading = true;
    this.masterService.getStoreSchedule().subscribe({
      next: (data) => {
        // backend returns HH:MM:SS, <input type="time"> wants HH:MM
        this.schedule = {
          ...data,
          opens_at: data.opens_at.slice(0, 5),
          closes_at: data.closes_at.slice(0, 5),
        };
        this.loading = false;
        this.cdf.detectChanges();
      },
      error: err => {
        console.error('Error loading store schedule', err);
        this.loading = false;
      }
    });
  }

  loadStatus() {
    this.masterService.getStoreStatus().subscribe({
      next: (data) => {
        this.isOpenNow = data.is_open;
        this.cdf.detectChanges();
      },
      error: err => console.error('Error loading store status', err)
    });
  }

  save() {
    this.saving = true;
    this.saveMessage = '';

    this.masterService.updateStoreSchedule(this.schedule).subscribe({
      next: () => {
        this.saving = false;
        this.saveMessage = 'Saved successfully.';
        this.loadStatus();
        this.cdf.detectChanges();
      },
      error: err => {
        console.error('Error saving store schedule', err);
        this.saving = false;
        this.saveMessage = 'Failed to save. Please try again.';
        this.cdf.detectChanges();
      }
    });
  }

  toggleForceClosed() {
    this.schedule.is_force_closed = !this.schedule.is_force_closed;
  }
}
