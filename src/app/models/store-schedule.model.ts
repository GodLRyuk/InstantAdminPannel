export interface StoreScheduleModel {
  opens_at: string;          // HH:MM:SS
  closes_at: string;         // HH:MM:SS
  is_force_closed: boolean;
  updated_at?: string;
}

export interface StoreStatusModel {
  is_open: boolean;
  opens_at: string;
  closes_at: string;
  server_time: string;
}
