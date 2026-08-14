import type { ProductVariant } from '../../types'

export type SelectedOptions = Record<number, number>

function matches(variant: ProductVariant, selection: SelectedOptions) {
  return Object.entries(selection).every(([attributeId, valueId]) => variant.attributes.some((item) => item.attribute_id === Number(attributeId) && item.value_id === valueId))
}

export function compatibleVariants(variants: ProductVariant[], selection: SelectedOptions) {
  return variants.filter((variant) => variant.status === 'active' && matches(variant, selection))
}

export function resolveProductVariant(variants: ProductVariant[], selection: SelectedOptions, requiredAttributeIds: number[]) {
  if (requiredAttributeIds.some((attributeId) => !selection[attributeId])) return null
  const selectedValueIds = requiredAttributeIds.map((attributeId) => selection[attributeId]).sort((left, right) => left - right)
  const matchesExact = variants.filter((variant) => {
    const variantValueIds = variant.attributes.filter((item) => requiredAttributeIds.includes(item.attribute_id)).map((item) => item.value_id).sort((left, right) => left - right)
    return variant.status === 'active' && variantValueIds.length === selectedValueIds.length && variantValueIds.every((valueId, index) => valueId === selectedValueIds[index])
  })
  return matchesExact.length === 1 ? matchesExact[0] : null
}

export function optionAvailability(variants: ProductVariant[], selection: SelectedOptions, attributeId: number, valueId: number) {
  const candidateSelection = { ...selection, [attributeId]: valueId }
  const candidates = compatibleVariants(variants, candidateSelection)
  return { exists: candidates.length > 0, inStock: candidates.some((variant) => variant.stock > 0) }
}

export function resetProductSelection() {
  return {} as SelectedOptions
}
