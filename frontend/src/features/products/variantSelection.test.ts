import { describe, expect, it } from 'vitest'
import { selectProductVariant } from './variantSelection'
import type { ProductVariant } from '../../types'

describe('product variant selection', () => {
  const variants = [{ id: 1, sku: 'A' }, { id: 2, sku: 'B' }] as ProductVariant[]
  it('chọn đúng biến thể và fallback về biến thể đầu', () => {
    expect(selectProductVariant(variants, 2).sku).toBe('B')
    expect(selectProductVariant(variants, 99).sku).toBe('A')
  })
})
