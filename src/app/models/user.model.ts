export type UserRole = 'CUSTOMER' | 'ADMIN' | 'DELIVERY' | 'PICKUP' | 'RESTAURANT';

export interface CreateUserPayload {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  role: UserRole;
}

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
