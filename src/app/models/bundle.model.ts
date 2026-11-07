import { ProductModel } from './products.model';

export interface Bundle {
  id: number;
  name: string;
  description: string;
  image: string | null;
  products: Array<number | ProductModel>;
  bundle_price: string | number;
  is_active: boolean;
  created_at: string;
}

export interface BundlePayload {
  name: string;
  description: string;
  image: File | null;
  products: number[];
  bundle_price: number;
  is_active: boolean;
}

export function toBundleFormData(bundle: BundlePayload): FormData {
  const formData = new FormData();
  formData.append('name', bundle.name);
  formData.append('description', bundle.description);
  for (const productId of bundle.products) {
    formData.append('products', String(productId));
  }
  formData.append('bundle_price', String(bundle.bundle_price));
  formData.append('is_active', String(bundle.is_active));
  if (bundle.image) {
    formData.append('image', bundle.image);
  }
  return formData;
}
