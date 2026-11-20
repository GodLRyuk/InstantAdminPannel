import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { RestaurantAdminService } from './restaurant-admin.service';
import { ADMIN_CSS, errorText } from './restaurants-shared';

@Component({
  selector: 'app-restaurant-menu-bulk-upload',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [ADMIN_CSS, ':host { display: block; padding: 0; }'],
  template: `
    <input #picker hidden type="file" accept=".xlsx" (change)="upload(picker)" />
    <button class="btn" type="button" [disabled]="uploading()" (click)="picker.click()">
      {{ uploading() ? 'Uploading...' : 'Bulk Upload' }}
    </button>
    @if (message()) {
      <div class="ok" role="status">{{ message() }}</div>
    }
    @if (error()) {
      <div class="err" role="alert">{{ error() }}</div>
    }
  `,
})
export class RestaurantMenuBulkUploadComponent {
  private readonly api = inject(RestaurantAdminService);
  private readonly destroyRef = inject(DestroyRef);

  readonly resource = input.required<'categories' | 'items'>();
  readonly uploaded = output<void>();
  readonly uploading = signal(false);
  readonly message = signal('');
  readonly error = signal('');

  upload(picker: HTMLInputElement): void {
    const file = picker.files?.[0];
    picker.value = '';
    if (!file || this.uploading()) return;

    this.message.set('');
    this.error.set('');
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      this.error.set('Select an Excel (.xlsx) file.');
      return;
    }

    const resource = this.resource();
    this.uploading.set(true);
    this.api.bulkUploadMenu(resource, file).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.uploading.set(false)),
    ).subscribe({
      next: () => {
        this.message.set(resource === 'categories' ? 'Category file uploaded.' : 'Menu item file uploaded.');
        this.uploaded.emit();
      },
      error: (err: unknown) => this.error.set(errorText(err)),
    });
  }
}
