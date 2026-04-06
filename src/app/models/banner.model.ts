export interface BannerModel {
  id?: number;           // optional, comes from the backend
  title: string;         // banner title
  image: string;         // URL of the image
  link?: string;         // optional link
  is_active: boolean;    // active status
  created_at?: string;   // optional, ISO string from backend
  updated_at?: string;   // optional, ISO string from backend
}