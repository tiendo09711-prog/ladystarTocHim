import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingState } from '../../components/common/LoadingState'
import { ProductCard } from '../../components/products/ProductCard'
import { useCart } from '../../stores/CartContext'
import type { ApiResponse, WishlistEntry } from '../../types'

export function WishlistPage() {
  const client = useQueryClient()
  const { addItem } = useCart()
  const [pendingId, setPendingId] = useState<number | null>(null)
  const query = useQuery({ queryKey: ['wishlist'], queryFn: async () => (await apiClient.get<ApiResponse<WishlistEntry[]>>('/account/wishlist')).data.data })
  const remove = async (entry: WishlistEntry) => {
    if (!confirm(`Xóa ${entry.product.name} khỏi danh sách yêu thích?`)) return
    setPendingId(entry.id)
    try {
      await apiClient.delete(`/account/wishlist/items/${entry.id}`)
      await client.invalidateQueries({ queryKey: ['wishlist'] })
      toast.success('Đã xóa khỏi danh sách yêu thích.')
    } catch (error) {
      toast.error(axios.isAxiosError(error) ? error.response?.data?.message ?? 'Không thể xóa sản phẩm.' : 'Không thể xóa sản phẩm.')
    } finally { setPendingId(null) }
  }
  const addToCart = async (entry: WishlistEntry) => {
    if (!entry.variant || entry.variant.status !== 'active' || entry.variant.stock < 1) return
    setPendingId(entry.id)
    try { await addItem(entry.product, entry.variant, 1); toast.success('Đã thêm vào giỏ hàng.') } finally { setPendingId(null) }
  }

  return <div><h1 className='mb-6 text-2xl font-black'>Sản phẩm yêu thích</h1>{query.isLoading ? <LoadingState /> : query.data?.length ? <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>{query.data.map((entry) => <article key={entry.id} className='grid gap-3'><ProductCard product={entry.product} />{entry.variant && <div className='rounded-xl bg-slate-50 p-3 text-sm'><strong>{entry.variant.sku}</strong><div className='muted mt-1'>{entry.variant.attributes.map((attribute) => attribute.value).join(' · ') || 'Phân loại đã chọn'}</div></div>}<div className='grid gap-2'>{entry.variant ? entry.variant.status === 'active' && entry.variant.stock > 0 ? <button className='btn-primary' disabled={pendingId === entry.id} onClick={() => void addToCart(entry)}>{pendingId === entry.id ? 'Đang thêm...' : 'Thêm vào giỏ'}</button> : <><p className='text-sm font-bold text-amber-700'>Phân loại này hiện không khả dụng.</p><Link className='btn-secondary justify-center' to={`/san-pham/${entry.product.slug}`}>Xem sản phẩm</Link></> : <Link className='btn-primary justify-center' to={`/san-pham/${entry.product.slug}`}>Chọn phân loại</Link>}<button className='btn-secondary w-full text-red-700' disabled={pendingId === entry.id} onClick={() => void remove(entry)}>Xóa khỏi yêu thích</button></div></article>)}</div> : <EmptyState title='Chưa có sản phẩm yêu thích' description='Lưu sản phẩm hoặc phân loại để dễ xem lại sau.' />}</div>
}
