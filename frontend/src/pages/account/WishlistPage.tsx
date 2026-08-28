import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingState } from '../../components/common/LoadingState'
import { ProductCard } from '../../components/products/ProductCard'
import type { ApiResponse, Product } from '../../types'

export function WishlistPage() {
  const client = useQueryClient()
  const [removingId, setRemovingId] = useState<number | null>(null)
  const query = useQuery({ queryKey: ['wishlist'], queryFn: async () => (await apiClient.get<ApiResponse<Product[]>>('/account/wishlist')).data.data })
  const remove = async (product: Product) => {
    if (!confirm(`Xóa ${product.name} khỏi danh sách yêu thích?`)) return
    setRemovingId(product.id)
    try {
      await apiClient.delete(`/account/wishlist/${product.id}`)
      await client.invalidateQueries({ queryKey: ['wishlist'] })
      toast.success('Đã xóa khỏi danh sách yêu thích.')
    } catch (error) {
      toast.error(axios.isAxiosError(error) ? error.response?.data?.message ?? 'Không thể xóa sản phẩm.' : 'Không thể xóa sản phẩm.')
    } finally { setRemovingId(null) }
  }
  return <div><h1 className='mb-6 text-2xl font-black'>Sản phẩm yêu thích</h1>{query.isLoading ? <LoadingState /> : query.data?.length ? <div className='grid grid-cols-2 gap-4 lg:grid-cols-3'>{query.data.map((product) => <div key={product.id} className='grid gap-2'><ProductCard product={product} /><button className='btn-secondary w-full text-red-700' disabled={removingId === product.id} onClick={() => void remove(product)}>{removingId === product.id ? 'Đang xóa...' : 'Xóa khỏi yêu thích'}</button></div>)}</div> : <EmptyState title='Chưa có sản phẩm yêu thích' description='Lưu sản phẩm để dễ xem lại sau.' />}</div>
}
