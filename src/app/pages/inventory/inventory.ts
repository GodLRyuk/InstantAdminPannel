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
  filteredItems: InventoryModel[] = [];
  pagedItems: InventoryModel[] = [];

  showModal = false;
  modalType: 'add' | 'edit' = 'add';

  // Search
  searchTerm = '';

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  constructor(
    private masterService: MasterService,
    private cdf: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadInventoryItem();
  }

  loadInventoryItem() {
    this.masterService.getInventoryItem().subscribe({
      next: (data: InventoryModel[]) => {
        this.inventoryItems = data;
        this.applyFilter();
        this.cdf.detectChanges();
      },
      error: err => console.error('Error loading inventoryItems', err)
    });
  }

  // Search
  onSearch() {
    this.currentPage = 1;
    this.applyFilter();
  }

  applyFilter() {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredItems = term
      ? this.inventoryItems.filter(i => i.product_name.toLowerCase().includes(term))
      : this.inventoryItems;

    this.totalPages = Math.max(1, Math.ceil(this.filteredItems.length / this.pageSize));
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    this.updatePagedItems();
  }

  // Pagination
  updatePagedItems() {
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedItems = this.filteredItems.slice(start, start + this.pageSize);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.updatePagedItems();
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
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