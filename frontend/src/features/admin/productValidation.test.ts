import { describe, expect, it } from 'vitest'
import { validateProductDraft } from './productValidation'

describe('admin product validation', () => {
  it('từ chối giá khuyến mãi lớn hơn giá gốc', () => {
    expect(validateProductDraft('Hair System', 'hair-system', [{ sku: 'HS-01', price: 1000000, sale_price: 1100000 }])).toContain('Giá khuyến mãi phải thấp hơn giá gốc.')
  })
  it('chấp nhận dữ liệu hợp lệ', () => {
    expect(validateProductDraft('Hair System', 'hair-system', [{ sku: 'HS-01', price: 1000000, sale_price: 900000 }])).toEqual([])
  })
})
