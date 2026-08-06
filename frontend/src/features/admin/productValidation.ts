interface DraftVariant { sku: string; price: number; sale_price: number | '' }

export function validateProductDraft(name: string, slug: string, variants: DraftVariant[]): string[] {
  const errors: string[] = []
  if (name.trim().length < 2) errors.push('Tên sản phẩm chưa hợp lệ.')
  if (!/^[a-z0-9-]+$/.test(slug)) errors.push('Slug chỉ gồm chữ thường, số và dấu gạch ngang.')
  if (!variants.length || variants.some((item) => !item.sku.trim() || item.price < 0)) errors.push('Biến thể phải có SKU và giá không âm.')
  if (variants.some((item) => item.sale_price !== '' && Number(item.sale_price) >= item.price)) errors.push('Giá khuyến mãi phải thấp hơn giá gốc.')
  return errors
}
