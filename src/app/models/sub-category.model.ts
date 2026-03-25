export class SubCategoryModel {
  id?: number;
  name!: string;
  categoryId!: number;
  categoryName?: string; // ✅ FIX
}