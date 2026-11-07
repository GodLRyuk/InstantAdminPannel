import { BundlePayload, toBundleFormData } from './bundle.model';

describe('toBundleFormData', () => {
  it('serializes bundle fields and selected product IDs for the admin API', () => {
    const payload: BundlePayload = {
      name: 'Breakfast bundle',
      description: 'Milk and bread',
      image: null,
      products: [12, 24],
      bundle_price: 149.5,
      is_active: true,
    };

    const formData = toBundleFormData(payload);

    expect(formData.get('name')).toBe('Breakfast bundle');
    expect(formData.get('description')).toBe('Milk and bread');
    expect(formData.getAll('products')).toEqual(['12', '24']);
    expect(formData.get('bundle_price')).toBe('149.5');
    expect(formData.get('is_active')).toBe('true');
    expect(formData.has('image')).toBe(false);
  });
});
