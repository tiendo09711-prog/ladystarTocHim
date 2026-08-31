import { describe, expect, it } from 'vitest'
import { formatCompactPrice, formatPrice } from './format'

describe('formatPrice', () => {
  it('uses the configured ISO currency', () => {
    expect(formatPrice(1234, 'USD')).toBe(new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'USD' }).format(1234))
  })

  it('stays neutral while store settings are unconfigured', () => {
    expect(formatPrice(1234, '')).toBe(new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(1234))
  })

  it('formats chart ticks using the configured currency without fixed VND units', () => {
    expect(formatCompactPrice(1_000_000, 'USD')).toBe(new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(1_000_000))
  })
})
