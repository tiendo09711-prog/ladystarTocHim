import type { ProductVariant } from '../../types'

export function selectProductVariant(variants: ProductVariant[], selectedId: number | null) {
  return variants.find((item) => item.id === selectedId) ?? variants[0]
}
