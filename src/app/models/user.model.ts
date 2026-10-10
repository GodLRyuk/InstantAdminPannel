export type UserRole = 'CUSTOMER' | 'ADMIN' | 'DELIVERY' | 'PICKUP';

export interface AdminUser {
  id: number;
  username: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  phone_number?: string | null;
  role: UserRole;
  is_active?: boolean;
  date_joined?: string;
}
