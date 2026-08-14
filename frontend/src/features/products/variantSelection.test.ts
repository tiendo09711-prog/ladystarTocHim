import { describe, expect, it } from 'vitest'
import type { ProductVariant } from '../../types'
import { compatibleVariants, optionAvailability, resetProductSelection, resolveProductVariant } from './variantSelection'

const variant = (id: number, size: number, color: number, base: number, stock = 3): ProductVariant => ({ id, sku: `SKU-${id}`, price: id * 100, current_price: id * 100, status: 'active', stock, attributes: [{ attribute_id: 1, value_id: size, value: '' }, { attribute_id: 2, value_id: color, value: '' }, { attribute_id: 3, value_id: base, value: '' }] })
const variants = [variant(1, 11, 21, 31), variant(2, 11, 22, 32), variant(3, 12, 21, 32, 0)]

describe('product variant resolver', () => {
  it('không resolve khi chưa chọn và lọc được partial selection', () => {
    expect(resolveProductVariant(variants, {}, [1, 2, 3])).toBeNull()
    expect(compatibleVariants(variants, { 1: 11 }).map((item) => item.id)).toEqual([1, 2])
  })
  it('tính availability theo combination và tồn kho', () => {
    expect(optionAvailability(variants, { 1: 11, 2: 22 }, 3, 32)).toEqual({ exists: true, inStock: true })
    expect(optionAvailability(variants, { 1: 11, 2: 22 }, 3, 31)).toEqual({ exists: false, inStock: false })
    expect(optionAvailability(variants, { 1: 12, 2: 21 }, 3, 32)).toEqual({ exists: true, inStock: false })
  })
  it('resolve exact, invalid trả null và reset selection', () => {
    expect(resolveProductVariant(variants, { 1: 11, 2: 22, 3: 32 }, [1, 2, 3])?.id).toBe(2)
    expect(resolveProductVariant(variants, { 1: 11, 2: 22, 3: 31 }, [1, 2, 3])).toBeNull()
    expect(resetProductSelection()).toEqual({})
  })
})
