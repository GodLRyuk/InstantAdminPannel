export interface advBannerModel {
  id?: number;           // banner title
  image: string;          // optional link
  is_active: boolean;    // active status
  created_at?: string;   // optional, ISO string from backend
  updated_at?: string;   // optional, ISO string from backend
}