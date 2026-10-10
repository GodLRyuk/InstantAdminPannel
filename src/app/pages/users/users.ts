import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { AdminUser, UserRole } from '../../models/user.model';
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

  readonly roles: { value: UserRole | ''; label: string }[] = [
    { value: '', label: 'All roles' },
    { value: 'CUSTOMER', label: 'Customers' },
    { value: 'ADMIN', label: 'Admins' },
    { value: 'DELIVERY', label: 'Delivery' },
    { value: 'PICKUP', label: 'Pickup' },
  ];
  readonly users = signal<AdminUser[]>([]);
  readonly selectedRole = signal<UserRole | ''>('');
  readonly loading = signal(false);
  readonly error = signal('');

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
