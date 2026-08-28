import { describe, expect, it } from 'vitest'
import type { Address, User } from '../../types'
import { manualShippingFields, shippingFieldsFromAddress } from './address'

describe('checkout address mapping', () => {
  it('maps saved address fields without changing customer email', () => {
    const address: Address = { id: 1, recipient_name: 'Nguyễn Văn A', phone: '0900000000', province: 'Hà Nội', district: 'Ba Đình', ward: 'Điện Biên', address_line: '10 Trần Phú', postal_code: null, is_default: true }
    expect(shippingFieldsFromAddress(address, 'customer@example.com')).toEqual({ customer_name: 'Nguyễn Văn A', customer_phone: '0900000000', customer_email: 'customer@example.com', province: 'Hà Nội', district: 'Ba Đình', ward: 'Điện Biên', shipping_address: '10 Trần Phú' })
  })

  it('creates a clean manual form while retaining authenticated identity', () => {
    const user: User = { id: 1, name: 'Khách hàng', email: 'customer@example.com', phone: '0911111111', role: 'user', status: 'active' }
    expect(manualShippingFields(user)).toEqual({ customer_name: 'Khách hàng', customer_phone: '0911111111', customer_email: 'customer@example.com', province: '', district: '', ward: '', shipping_address: '' })
  })
})
