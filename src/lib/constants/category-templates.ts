export interface CategoryTemplate {
  productType: 'physical' | 'service';
  extraFields: string[];
  fieldLabelsEn: Record<string, string>;
  fieldLabelsAr: Record<string, string>;
}

export const CATEGORY_TEMPLATES: Record<string, CategoryTemplate> = {
  fashion: {
    productType: 'physical',
    extraFields: ['color', 'size'],
    fieldLabelsEn: { color: 'Color', size: 'Size' },
    fieldLabelsAr: { color: 'اللون', size: 'المقاس' },
  },
  food_drinks: {
    productType: 'physical',
    extraFields: ['ingredients', 'allergens', 'portion_size'],
    fieldLabelsEn: { ingredients: 'Ingredients', allergens: 'Allergens', portion_size: 'Portion Size' },
    fieldLabelsAr: { ingredients: 'المكونات', allergens: 'مسببات الحساسية', portion_size: 'حجم الوجبة' },
  },
  electronics: {
    productType: 'physical',
    extraFields: ['model', 'warranty', 'specs'],
    fieldLabelsEn: { model: 'Model', warranty: 'Warranty', specs: 'Specs' },
    fieldLabelsAr: { model: 'الموديل', warranty: 'الضمان', specs: 'المواصفات' },
  },
  services: {
    productType: 'service',
    extraFields: ['duration', 'delivery_method'],
    fieldLabelsEn: { duration: 'Duration', delivery_method: 'Delivery Method' },
    fieldLabelsAr: { duration: 'المدة', delivery_method: 'طريقة تقديم الخدمة' },
  },
  general: {
    productType: 'physical',
    extraFields: [],
    fieldLabelsEn: {},
    fieldLabelsAr: {},
  }
}

/**
 * Resolves a category string (e.g. 'Food & Drinks', 'ملابس وأزياء', 'fashion') to a CategoryTemplate.
 */
export function getCategoryTemplate(categoryStr?: string | null): CategoryTemplate {
  if (!categoryStr) return CATEGORY_TEMPLATES.general

  const lower = categoryStr.toLowerCase().trim()
  if (lower.includes('fashion') || lower.includes('ملابس') || lower.includes('أزياء') || lower.includes('موضة')) {
    return CATEGORY_TEMPLATES.fashion
  }
  if (lower.includes('food') || lower.includes('drink') || lower.includes('مطعم') || lower.includes('أغذية') || lower.includes('طعام') || lower.includes('مأكولات')) {
    return CATEGORY_TEMPLATES.food_drinks
  }
  if (lower.includes('electronic') || lower.includes('إلكترونيات') || lower.includes('أجهزة') || lower.includes('موبايل')) {
    return CATEGORY_TEMPLATES.electronics
  }
  if (lower.includes('service') || lower.includes('خدمات') || lower.includes('استشارات') || lower.includes('صيانة')) {
    return CATEGORY_TEMPLATES.services
  }

  return CATEGORY_TEMPLATES.general
}
