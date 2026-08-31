import { useCallback } from 'react'
import { useCurrency } from '../stores/CurrencyContext'

export function formatPrice(value: number | string, currency: string, locale = 'vi-VN') {
  const amount = Number(value)
  try {
    if (!currency) return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(amount)
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
  } catch {
    return String(amount)
  }
}

export function formatCompactPrice(value: number | string, currency: string, locale = 'vi-VN') {
  const amount = Number(value)
  try {
    if (!currency) return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(amount)
    return new Intl.NumberFormat(locale, { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(amount)
  } catch {
    return String(amount)
  }
}

export function formatDateTime(value: string | Date, timezone?: string | null, locale = 'vi-VN') {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short', timeZone: timezone || undefined }).format(new Date(value))
  } catch {
    return new Date(value).toLocaleString(locale)
  }
}

export function useFormatPrice() {
  const currency = useCurrency()
  return useCallback((value: number | string) => formatPrice(value, currency), [currency])
}

export function useFormatCompactPrice() {
  const currency = useCurrency()
  return useCallback((value: number | string) => formatCompactPrice(value, currency), [currency])
}
export const statusLabel: Record<string, string> = { pending: 'Chờ xác nhận', requested: 'Đã gửi yêu cầu', reviewing: 'Đang xem xét', approved: 'Đã duyệt', returning: 'Đang hoàn hàng', received: 'Đã nhận hàng', confirmed: 'Đã xác nhận', processing: 'Đang xử lý', ready: 'Sẵn sàng bàn giao', checked_in: 'Đã check-in', no_show: 'Không đến', shipping: 'Đang giao', shipped: 'Đã giao đơn vị vận chuyển', delivered: 'Đã nhận hàng', delivery_failed: 'Giao hàng thất bại', returned: 'Đã hoàn về kho', completed: 'Hoàn thành', rejected: 'Đã từ chối', cancelled: 'Đã hủy', unpaid: 'Chưa thanh toán', paid: 'Đã thanh toán', partially_refunded: 'Đã hoàn tiền một phần', refunded: 'Đã hoàn tiền', active: 'Đang hoạt động', inactive: 'Đã ẩn', draft: 'Bản nháp' }
