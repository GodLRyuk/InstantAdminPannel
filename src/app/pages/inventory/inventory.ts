import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MasterService } from '../../services/auth.service';
import { InventoryModel } from '../../models/inventory.model';

@Component({
  selector: 'app-inventory',
  standalone: false,
  templateUrl: './inventory.html',
  styleUrl: './inventory.css',
})
export class Inventory implements OnInit {

  inventoryItems: InventoryModel[] = [];
  showModal = false;
  modalType: 'add' | 'edit' = 'add';

  constructor(
    private masterService: MasterService,
    private cdf: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadInventoryItem();
  }

  loadInventoryItem() {
    this.masterService.getInventoryItem().subscribe({
      next: (data: InventoryModel[]) => {   // ✅ typed response
        this.inventoryItems = data;
        this.cdf.detectChanges();
      },
      error: err => console.error('Error loading inventoryItems', err)
    });
  }

  openAddModal() {
    this.modalType = 'add';
    this.showModal = true;
  }

  openEditModal(brand: InventoryModel) {
    this.modalType = 'edit';
    this.showModal = true;
  }


}