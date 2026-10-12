export interface Login {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  role?: string;
  is_restaurant?: boolean;
  is_staff?: boolean;
  username?: string;
}