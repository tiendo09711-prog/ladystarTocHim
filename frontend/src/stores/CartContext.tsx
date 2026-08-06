import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiClient } from '../api/apiClient'
import type { ApiResponse, CartData, CartItem, Product, ProductVariant } from '../types'
import { useAuth } from './AuthContext'
import { calculateCartSubtotal } from '../features/cart/calculations'

interface CartContextValue extends CartData {
  loading: boolean
  addItem: (product: Product, variant: ProductVariant, quantity: number) => Promise<void>
  updateItem: (id: number | string, quantity: number) => Promise<void>
  removeItem: (id: number | string) => Promise<void>
  clear: () => Promise<void>
  refresh: () => Promise<void>
}

const CartContext = createContext<CartContextValue | null>(null)
const storageKey = 'nam-hair-guest-cart'

function readGuestItems(): CartItem[] {
  try { return JSON.parse(localStorage.getItem(storageKey) ?? '[]') as CartItem[] } catch { return [] }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)

  const persistGuest = (next: CartItem[]) => { setItems(next); localStorage.setItem(storageKey, JSON.stringify(next)) }

  const refresh = useCallback(async () => {
    if (authLoading) return
    if (!user) { setItems(readGuestItems()); setLoading(false); return }
    try {
      const guestItems = readGuestItems()
      if (guestItems.length) {
        for (const item of guestItems) await apiClient.post('/cart/items', { product_variant_id: item.product_variant_id, quantity: item.quantity })
        localStorage.removeItem(storageKey)
      }
      const response = await apiClient.get<ApiResponse<CartData>>('/cart')
      setItems(response.data.data.items)
    } finally { setLoading(false) }
  }, [user, authLoading])

  useEffect(() => { void refresh() }, [refresh])

  const addItem = async (product: Product, variant: ProductVariant, quantity: number) => {
    if (user) {
      await apiClient.post('/cart/items', { product_variant_id: variant.id, quantity })
      await refresh()
      return
    }
    const current = readGuestItems()
    const existing = current.find((item) => item.product_variant_id === variant.id)
    const nextQuantity = Math.min((existing?.quantity ?? 0) + quantity, variant.stock)
    const nextItem: CartItem = { id: `guest-${variant.id}`, product_variant_id: variant.id, quantity: nextQuantity, unit_price: variant.current_price, variant: { ...variant, product } }
    persistGuest(existing ? current.map((item) => item.product_variant_id === variant.id ? nextItem : item) : [...current, nextItem])
  }

  const updateItem = async (id: number | string, quantity: number) => {
    if (user) { await apiClient.patch(`/cart/items/${id}`, { quantity }); await refresh(); return }
    persistGuest(readGuestItems().map((item) => item.id === id ? { ...item, quantity: Math.min(quantity, item.variant.stock) } : item))
  }
  const removeItem = async (id: number | string) => {
    if (user) { await apiClient.delete(`/cart/items/${id}`); await refresh(); return }
    persistGuest(readGuestItems().filter((item) => item.id !== id))
  }
  const clear = async () => {
    if (user) { await apiClient.delete('/cart'); setItems([]); return }
    persistGuest([])
  }

  return <CartContext.Provider value={{ items, subtotal: calculateCartSubtotal(items), count: items.reduce((sum, item) => sum + item.quantity, 0), loading, addItem, updateItem, removeItem, clear, refresh }}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart phải được dùng trong CartProvider')
  return context
}
