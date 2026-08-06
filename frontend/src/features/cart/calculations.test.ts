import { describe, expect, it } from 'vitest'
import { calculateCartSubtotal } from './calculations'
import type { CartItem } from '../../types'

describe('cart calculation', () => {
  it('tính tổng theo đơn giá và số lượng', () => {
    const items = [{ unit_price: 1200000, quantity: 2 }, { unit_price: 30000, quantity: 1 }] as CartItem[]
    expect(calculateCartSubtotal(items)).toBe(2430000)
  })
})
