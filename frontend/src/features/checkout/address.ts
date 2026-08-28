import type { Address, User } from '../../types'

export interface ShippingFields {
  customer_name: string
  customer_phone: string
  customer_email: string
  province: string
  district: string
  ward: string
  shipping_address: string
}

export function shippingFieldsFromAddress(address: Address, email: string): ShippingFields {
  return {
    customer_name: address.recipient_name,
    customer_phone: address.phone,
    customer_email: email,
    province: address.province,
    district: address.district,
    ward: address.ward,
    shipping_address: address.address_line,
  }
}

export function manualShippingFields(user: User | null): ShippingFields {
  return {
    customer_name: user?.name ?? '',
    customer_phone: user?.phone ?? '',
    customer_email: user?.email ?? '',
    province: '',
    district: '',
    ward: '',
    shipping_address: '',
  }
}
