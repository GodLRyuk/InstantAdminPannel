import { ChangeDetectionStrategy, Component, DestroyRef, OnChanges, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, Subject, finalize, takeUntil } from 'rxjs';
import { RestaurantAdminService } from './restaurant-admin.service';
import { AddonGroup, AddonOption } from './restaurant.models';
import { ADMIN_CSS, errorText } from './restaurants-shared';

@Component({
  selector: 'app-restaurant-menu-addons',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [ADMIN_CSS, `
    :host { display: block; padding: 0; }
    fieldset { border: 0; margin: 0; padding: 0; min-width: 0; }
    .group-tabs, .options { margin-top: 16px; }
    .grid input { min-width: 0; }
  `],
  template: `
    <section class="card" aria-labelledby="menu-addons-heading">
      <h2 id="menu-addons-heading">Add-ons</h2>
      @if (error()) {
        <div class="err" role="alert">{{ error() }}</div>
      }
      @if (message()) {
        <div class="ok" role="status">{{ message() }}</div>
      }
      @if (busy()) {
        <p class="muted" role="status">Working on add-ons…</p>
      }

      @if (!groupsLoaded()) {
        @if (!busy()) {
          <button class="btn grey" type="button" (click)="loadGroups()">Retry loading groups</button>
        }
      } @else {
        <div class="bar group-tabs" aria-label="Add-on groups" role="group">
          @for (group of groups(); track group.id) {
            <button class="btn sm" type="button" [class.grey]="groupId() !== group.id"
              [attr.aria-pressed]="groupId() === group.id" [disabled]="busy()" (click)="selectGroup(group)">
              {{ group.name }}
            </button>
          }
          <button class="btn ghost sm" type="button" [disabled]="busy()" (click)="startGroup()">
            New group
          </button>
        </div>

        <form [formGroup]="groupForm" (ngSubmit)="saveGroup()">
          <fieldset [disabled]="busy()">
            <legend>{{ groupId() === null ? 'New group' : 'Edit group' }}</legend>
            <div class="grid">
              <label class="f">Group name
                <input formControlName="name" required />
              </label>
              <label class="f">Minimum selections
                <input type="number" formControlName="min_select" required min="0" step="1" />
              </label>
              <label class="f">Maximum selections
                <input type="number" formControlName="max_select" required min="0" step="1" />
              </label>
            </div>
            <div class="row-end">
              @if (groupId() !== null) {
                <button class="btn red" type="button" (click)="deleteGroup()">Remove group</button>
              }
              <button class="btn" type="submit" [disabled]="groupForm.invalid">
                {{ groupId() === null ? 'Create group' : 'Save group' }}
              </button>
            </div>
          </fieldset>
        </form>

        @if (groupId() !== null) {
          <div class="options">
            <h3>Options</h3>
            @if (!optionsLoaded()) {
              @if (!busy()) {
                <button class="btn grey" type="button" (click)="loadOptions()">Retry loading options</button>
              }
            } @else {
              <div class="wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Option</th>
                      <th scope="col">Price</th>
                      <th scope="col">Availability</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (option of options(); track option.id) {
                      <tr>
                        <td>{{ option.name }}</td>
                        <td>₹{{ option.price }}</td>
                        <td>{{ option.is_available ? 'Available' : 'Unavailable' }}</td>
                        <td>
                          <div class="actions">
                            <button class="btn ghost sm" type="button" [disabled]="busy()"
                              (click)="editOption(option)">Edit</button>
                            <button class="btn red sm" type="button" [disabled]="busy()"
                              (click)="deleteOption(option)">Remove</button>
                          </div>
                        </td>
                      </tr>
                    } @empty {
                      <tr><td colspan="4" class="muted">No options in this group.</td></tr>
                    }
                  </tbody>
                </table>
              </div>
              <form [formGroup]="optionForm" (ngSubmit)="saveOption()">
                <fieldset [disabled]="busy()">
                  <legend>{{ optionId() === null ? 'New option' : 'Edit option' }}</legend>
                  <div class="grid">
                    <label class="f">Option name
                      <input formControlName="name" required />
                    </label>
                    <label class="f">Price (₹)
                      <input type="number" formControlName="price" required min="0" step="0.01" />
                    </label>
                    <label class="chk">
                      <input type="checkbox" formControlName="is_available" /> Available
                    </label>
                  </div>
                  <div class="row-end">
                    @if (optionId() !== null) {
                      <button class="btn grey" type="button" (click)="resetOption()">Cancel</button>
                    }
                    <button class="btn" type="submit" [disabled]="optionForm.invalid">
                      {{ optionId() === null ? 'Add option' : 'Save option' }}
                    </button>
                  </div>
                </fieldset>
              </form>
            }
          </div>
        }
      }
    </section>
  `,
})
export class RestaurantMenuAddonsComponent implements OnChanges {
  private readonly api = inject(RestaurantAdminService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly itemChanged = new Subject<void>();

  readonly itemId = input.required<number>();
  protected readonly groups = signal<AddonGroup[]>([]);
  protected readonly options = signal<AddonOption[]>([]);
  protected readonly groupId = signal<number | null>(null);
  protected readonly optionId = signal<number | null>(null);
  protected readonly groupsLoaded = signal(false);
  protected readonly optionsLoaded = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly message = signal('');

  protected readonly groupForm = this.fb.group({
    name: ['', Validators.required],
    min_select: [0, [Validators.required, Validators.min(0)]],
    max_select: [1, [Validators.required, Validators.min(0)]],
  });

  protected readonly optionForm = this.fb.group({
    name: ['', Validators.required],
    price: [0, [Validators.required, Validators.min(0)]],
    is_available: [true],
  });

  ngOnChanges(): void {
    this.itemChanged.next();
    this.groups.set([]);
    this.groupsLoaded.set(false);
    this.startGroup();
    this.loadGroups();
  }

  protected loadGroups(): void {
    this.run(this.api.addonGroups(this.itemId()), (response) => {
      this.groups.set(Array.isArray(response) ? response : response.results);
      this.groupsLoaded.set(true);
    });
  }

  protected startGroup(): void {
    this.groupId.set(null);
    this.groupForm.reset();
    this.resetOptions();
    this.clearFeedback();
  }

  protected selectGroup(group: AddonGroup): void {
    if (this.groupId() === group.id) return;
    this.groupId.set(group.id);
    this.groupForm.reset({ name: group.name, min_select: group.min_select, max_select: group.max_select });
    this.resetOptions();
    this.loadOptions();
  }

  protected saveGroup(): void {
    if (this.groupForm.invalid || this.busy()) return;
    this.clearFeedback();
    const { name, min_select, max_select } = this.groupForm.getRawValue();
    if (!name.trim()) {
      this.error.set('Enter a group name.');
      return;
    }
    if (!Number.isInteger(min_select) || !Number.isInteger(max_select) || max_select < min_select) {
      this.error.set('Enter whole-number selection limits. Maximum must be at least the minimum.');
      return;
    }

    const id = this.groupId();
    this.run(this.api.saveAddonGroup(this.itemId(), { name: name.trim(), min_select, max_select }, id), (saved) => {
      this.groups.update((groups) => id === null
        ? [...groups, saved]
        : groups.map((group) => group.id === id ? saved : group));
      this.groupId.set(saved.id);
      this.groupForm.reset({ name: saved.name, min_select: saved.min_select, max_select: saved.max_select });
      if (id === null) this.optionsLoaded.set(true);
      this.message.set(id === null ? 'Group created.' : 'Group saved.');
    });
  }

  protected deleteGroup(): void {
    const id = this.groupId();
    if (id === null || this.busy() || !window.confirm('Remove this add-on group and all its options?')) return;
    this.run(this.api.deleteAddonGroup(this.itemId(), id), () => {
      this.groups.update((groups) => groups.filter((group) => group.id !== id));
      this.startGroup();
      this.message.set('Group removed.');
    });
  }

  protected loadOptions(): void {
    const id = this.groupId();
    if (id === null) return;
    this.run(this.api.addonOptions(this.itemId(), id), (response) => {
      this.options.set(Array.isArray(response) ? response : response.results);
      this.optionsLoaded.set(true);
    });
  }

  protected editOption(option: AddonOption): void {
    this.clearFeedback();
    this.optionId.set(option.id);
    this.optionForm.reset({
      name: option.name,
      price: Number(option.price),
      is_available: option.is_available,
    });
  }

  protected resetOption(): void {
    this.optionId.set(null);
    this.optionForm.reset();
  }

  protected saveOption(): void {
    const group = this.groupId();
    if (group === null || this.optionForm.invalid || this.busy()) return;
    this.clearFeedback();
    const { name, price, is_available } = this.optionForm.getRawValue();
    if (!name.trim()) {
      this.error.set('Enter an option name.');
      return;
    }
    if (!Number.isFinite(price) || Number(price.toFixed(2)) !== price) {
      this.error.set('Enter a price with up to two decimal places.');
      return;
    }

    const id = this.optionId();
    this.run(this.api.saveAddonOption(
      this.itemId(), group, { name: name.trim(), price: price.toFixed(2), is_available }, id,
    ), (saved) => {
      this.options.update((options) => id === null
        ? [...options, saved]
        : options.map((option) => option.id === id ? saved : option));
      this.resetOption();
      this.message.set(id === null ? 'Option added.' : 'Option saved.');
    });
  }

  protected deleteOption(option: AddonOption): void {
    const group = this.groupId();
    if (group === null || this.busy() || !window.confirm('Remove this add-on option?')) return;
    this.run(this.api.deleteAddonOption(this.itemId(), group, option.id), () => {
      this.options.update((options) => options.filter((entry) => entry.id !== option.id));
      if (this.optionId() === option.id) this.resetOption();
      this.message.set('Option removed.');
    });
  }

  private resetOptions(): void {
    this.options.set([]);
    this.optionsLoaded.set(false);
    this.resetOption();
  }

  private clearFeedback(): void {
    this.error.set('');
    this.message.set('');
  }

  private run<T>(request: Observable<T>, onSuccess: (value: T) => void): void {
    if (this.busy()) return;
    this.clearFeedback();
    this.busy.set(true);
    request.pipe(
      takeUntil(this.itemChanged),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.busy.set(false)),
    ).subscribe({
      next: onSuccess,
      error: (err: unknown) => this.error.set(errorText(err)),
    });
  }
}
