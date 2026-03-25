import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { UnitModel } from '../../models/unit.model';
import { MasterService } from '../../services/auth.service';

@Component({
  selector: 'app-unit',
  standalone: false,
  templateUrl: './unit.html',
  styleUrl: './unit.css',
})
export class Unit implements OnInit {

  units: UnitModel[] = [];
  showModal = false;
  modalType: 'add' | 'edit' = 'add';
  selectedUnits: UnitModel | null = null;
  unitName = '';
  unitsShortName = '';

  constructor(
    private masterService: MasterService,
    private cdf: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadUnits();
  }
  loadUnits() {
    this.masterService.getAllunits().subscribe({
      next: data => {
        this.units = [...data];
        this.cdf.detectChanges();
      },
      error: err => console.error('Error loading units', err)
    });
  }

  openAddModal() {
      this.modalType = 'add';
      this.selectedUnits = null;
      this.unitName = '';
      this.unitsShortName = '';
      this.showModal = true;
    }
  
    openEditModal(unit: UnitModel) {
      this.modalType = 'edit';
      this.selectedUnits = unit;
      this.unitName = unit.name;
      this.unitsShortName = unit.short_name;
      this.showModal = true;
    }

     save() {
    if (this.modalType === 'add') {
      this.masterService.addUnit({ name: this.unitName, short_name: this.unitsShortName, status: 'Active' })
        .subscribe(() => this.loadUnits());
    } else if (this.modalType === 'edit' && this.selectedUnits) {
      this.masterService.updateUnit(this.selectedUnits.id, { name: this.unitName, short_name:this.unitsShortName })
        .subscribe(() => this.loadUnits());
    }
    this.showModal = false;
  }

  deleteUnit(id: number) {
    if (confirm('Are you sure you want to delete this units?')) {
      this.masterService.deleteUnit(id).subscribe(() => this.loadUnits());
      this.cdf.detectChanges();
    }
  }

}