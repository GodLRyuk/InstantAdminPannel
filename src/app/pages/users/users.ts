import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, Validators } from '@angular/forms';
import { AdminUser, CreateUserPayload, UserRole } from '../../models/user.model';
import { MasterService } from '../../services/auth.service';

@Component({
  selector: 'app-users',
  standalone: false,
  templateUrl: './users.html',
  styleUrl: './users.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Users implements OnInit {
  private readonly masterService = inject(MasterService);
  private readonly formBuilder = inject(FormBuilder);

  readonly roles: { value: UserRole | ''; label: string }[] = [
    { value: '', label: 'All roles' },
    { value: 'CUSTOMER', label: 'Customers' },
    { value: 'ADMIN', label: 'Admins' },
    { value: 'DELIVERY', label: 'Delivery' },
    { value: 'PICKUP', label: 'Pickup' },
    { value: 'RESTAURANT', label: 'Restaurants' },
  ];
  readonly createRoles = this.roles.filter((role) => role.value !== '');
  readonly userForm = this.formBuilder.nonNullable.group({
    username: ['', Validators.required],
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    phone: ['', Validators.required],
    address: ['', Validators.required],
    role: ['RESTAURANT' as UserRole, Validators.required],
  });
  readonly users = signal<AdminUser[]>([]);
  readonly selectedRole = signal<UserRole | ''>('');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly createError = signal('');
  readonly createSuccess = signal('');
  readonly creating = signal(false);
  readonly addFormOpen = signal(false);

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.error.set('');

    const role = this.selectedRole();
    this.masterService.getUsers(role || undefined).subscribe({
      next: (response) => {
        this.users.set(Array.isArray(response) ? response : response.results);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        console.error('Failed to load users', error);
        this.error.set('Unable to load users. Please try again.');
        this.loading.set(false);
      },
    });
  }

  toggleAddForm(): void {
    this.addFormOpen.update((open) => !open);
    this.createError.set('');
    this.createSuccess.set('');
  }

  createUser(): void {
    if (this.userForm.invalid || this.creating()) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.creating.set(true);
    this.createError.set('');
    this.createSuccess.set('');
    const payload: CreateUserPayload = this.userForm.getRawValue();
    this.masterService.createUser(payload).subscribe({
      next: () => {
        this.createSuccess.set('User created successfully.');
        this.userForm.reset({
          username: '',
          first_name: '',
          last_name: '',
          email: '',
          password: '',
          phone: '',
          address: '',
          role: 'RESTAURANT',
        });
        this.creating.set(false);
        this.loadUsers();
      },
      error: (error: unknown) => {
        console.error('Failed to create user', error);
        this.createError.set(this.createUserError(error));
        this.creating.set(false);
      },
    });
  }

  private createUserError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.error && typeof error.error === 'object') {
        const details = Object.entries(error.error as Record<string, unknown>)
          .map(([field, value]) => {
            const message = Array.isArray(value) ? value.join(' ') : String(value);
            return `${field}: ${message}`;
          })
          .join(' ');
        if (details) return details;
      }
      if (error.status === 0) return 'Cannot reach the server.';
      return error.message;
    }
    return 'Unable to create user. Check the details and try again.';
  }

  setRole(role: UserRole | ''): void {
    this.selectedRole.set(role);
    this.loadUsers();
  }

  onRoleChange(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      this.setRole(target.value as UserRole | '');
    }
  }

  displayName(user: AdminUser): string {
    const name = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
    return name || user.username;
  }
}
