import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ExpenseModel, ExpenseCategoryModel, ExpenseSummaryModel } from '../../models/expense.model';
import { MasterService } from '../../services/auth.service';

@Component({
  selector: 'app-expense',
  standalone: false,
  templateUrl: './expense.html',
  styleUrls: ['./expense.css']
})
export class Expense implements OnInit {

  expenses: ExpenseModel[] = [];
  filteredExpenses: ExpenseModel[] = [];
  pagedExpenses: ExpenseModel[] = [];

  categories: ExpenseCategoryModel[] = [];
  summary: ExpenseSummaryModel | null = null;

  // Expense modal
  showModal = false;
  modalType: 'add' | 'edit' = 'add';
  selectedExpense: ExpenseModel | null = null;

  form: Partial<ExpenseModel> = {};

  paymentMethods = ['CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'OTHER'];

  // Category modal
  showCategoryModal = false;
  categoryModalType: 'add' | 'edit' = 'add';
  selectedCategory: ExpenseCategoryModel | null = null;
  categoryName = '';

  // Filters
  filterCategoryId: number | null = null;
  filterStartDate = '';
  filterEndDate = '';

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
    this.loadCategories();
    this.loadExpenses();
    this.loadSummary();
  }

  // ── Load ──────────────────────────────
  loadCategories() {
    this.masterService.getExpenseCategories().subscribe({
      next: (data) => {
        this.categories = data;
        this.cdf.detectChanges();
      },
      error: err => console.error('Error loading expense categories', err)
    });
  }

  loadExpenses() {
    const params: any = {};
    if (this.filterCategoryId) params.category_id = this.filterCategoryId;
    if (this.filterStartDate) params.start_date = this.filterStartDate;
    if (this.filterEndDate) params.end_date = this.filterEndDate;

    this.masterService.getExpenses(params).subscribe({
      next: (data) => {
        this.expenses = data;
        this.applyFilter();
        this.cdf.detectChanges();
      },
      error: err => console.error('Error loading expenses', err)
    });
  }

  loadSummary() {
    const params: any = {};
    if (this.filterStartDate) params.start_date = this.filterStartDate;
    if (this.filterEndDate) params.end_date = this.filterEndDate;

    this.masterService.getExpenseSummary(params).subscribe({
      next: (data) => {
        this.summary = data;
        this.cdf.detectChanges();
      },
      error: err => console.error('Error loading expense summary', err)
    });
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadExpenses();
    this.loadSummary();
  }

  clearFilters() {
    this.filterCategoryId = null;
    this.filterStartDate = '';
    this.filterEndDate = '';
    this.onFilterChange();
  }

  // ── Search / Pagination ──────────────────────────────
  onSearch() {
    this.currentPage = 1;
    this.applyFilter();
  }

  applyFilter() {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredExpenses = term
      ? this.expenses.filter(e =>
          (e.title || '').toLowerCase().includes(term) ||
          (e.category_name || '').toLowerCase().includes(term) ||
          (e.reference_no || '').toLowerCase().includes(term)
        )
      : this.expenses;

    this.totalPages = Math.max(1, Math.ceil(this.filteredExpenses.length / this.pageSize));
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    this.updatePagedExpenses();
  }

  updatePagedExpenses() {
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedExpenses = this.filteredExpenses.slice(start, start + this.pageSize);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.updatePagedExpenses();
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  // ── Expense modal ──────────────────────────────
  openAddModal() {
    this.modalType = 'add';
    this.selectedExpense = null;
    this.form = {
      payment_method: 'CASH',
      expense_date: new Date().toISOString().slice(0, 10),
    };
    this.showModal = true;
  }

  openEditModal(expense: ExpenseModel) {
    this.modalType = 'edit';
    this.selectedExpense = expense;
    this.form = { ...expense };
    this.showModal = true;
  }

  save() {
    if (!this.form.category) {
      alert('Category is required');
      return;
    }
    if (!this.form.amount) {
      alert('Amount is required');
      return;
    }
    if (!this.form.expense_date) {
      alert('Date is required');
      return;
    }

    const payload: Partial<ExpenseModel> = {
      category: this.form.category,
      title: this.form.title || '',
      amount: this.form.amount,
      payment_method: this.form.payment_method as ExpenseModel['payment_method'],
      reference_no: this.form.reference_no || '',
      expense_date: this.form.expense_date,
      remarks: this.form.remarks || '',
    };

    if (this.modalType === 'add') {
      this.masterService.addExpense(payload).subscribe({
        next: () => {
          this.showModal = false;
          this.loadExpenses();
          this.loadSummary();
        },
        error: err => console.error('Error adding expense', err)
      });
    } else if (this.modalType === 'edit' && this.selectedExpense) {
      this.masterService.updateExpense(this.selectedExpense.id, payload).subscribe({
        next: () => {
          this.showModal = false;
          this.loadExpenses();
          this.loadSummary();
        },
        error: err => console.error('Error updating expense', err)
      });
    }
  }

  deleteExpense(id: number) {
    if (confirm('Are you sure you want to delete this expense?')) {
      this.masterService.deleteExpense(id).subscribe({
        next: () => {
          this.loadExpenses();
          this.loadSummary();
        },
        error: err => console.error('Error deleting expense', err)
      });
    }
  }

  // ── Category modal ──────────────────────────────
  openAddCategoryModal() {
    this.categoryModalType = 'add';
    this.selectedCategory = null;
    this.categoryName = '';
    this.showCategoryModal = true;
  }

  openEditCategoryModal(cat: ExpenseCategoryModel) {
    this.categoryModalType = 'edit';
    this.selectedCategory = cat;
    this.categoryName = cat.name;
    this.showCategoryModal = true;
  }

  saveCategory() {
    if (!this.categoryName.trim()) {
      alert('Category name is required');
      return;
    }

    if (this.categoryModalType === 'add') {
      this.masterService.addExpenseCategory({ name: this.categoryName, is_active: true }).subscribe({
        next: () => {
          this.showCategoryModal = false;
          this.loadCategories();
        },
        error: err => console.error('Error adding category', err)
      });
    } else if (this.categoryModalType === 'edit' && this.selectedCategory) {
      this.masterService.updateExpenseCategory(this.selectedCategory.id, { name: this.categoryName }).subscribe({
        next: () => {
          this.showCategoryModal = false;
          this.loadCategories();
        },
        error: err => console.error('Error updating category', err)
      });
    }
  }

  deleteCategory(id: number) {
    if (confirm('Delete this category? Expenses using it will block deletion if any exist.')) {
      this.masterService.deleteExpenseCategory(id).subscribe({
        next: () => this.loadCategories(),
        error: err => {
          console.error('Error deleting category', err);
          alert('Could not delete category — it may still have expenses linked to it.');
        }
      });
    }
  }
}
