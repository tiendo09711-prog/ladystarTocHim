import type { CartItem } from '../../types'

export function calculateCartSubtotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + Number(item.unit_price) * item.quantity, 0)
}
