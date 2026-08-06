import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit3, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { LoadingState } from '../../components/common/LoadingState'
import type { ApiResponse, Product } from '../../types'
import { formatPrice, statusLabel } from '../../utils/format'

interface ProductListResponse { data: Product[]; meta: { total: number; current_page: number; last_page: number } }

export function ProductsAdminPage() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['admin-products'], queryFn: async () => (await apiClient.get<ApiResponse<ProductListResponse>>('/admin/products')).data.data })
  const remove = async (id: number) => { if (!confirm('Xóa mềm sản phẩm này?')) return; await apiClient.delete(`/admin/products/${id}`); await client.invalidateQueries({ queryKey: ['admin-products'] }); toast.success('Đã xóa sản phẩm.') }
  return <div><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-black">Sản phẩm</h1><p className="muted">Quản lý thông tin, giá và biến thể sản phẩm.</p></div><Link className="btn-primary" to="/admin/products/create"><Plus size={18} />Thêm sản phẩm</Link></div>{query.isLoading ? <LoadingState /> : <div className="table-wrap"><table className="table"><thead><tr><th>Sản phẩm</th><th>SKU</th><th>Danh mục</th><th>Giá</th><th>Tồn kho</th><th>Trạng thái</th><th>Hành động</th></tr></thead><tbody>{query.data?.data.map((product) => { const variant = product.variants[0]; return <tr key={product.id}><td><div className="flex items-center gap-3"><img src={product.images[0]?.image_path || '/images/product-placeholder.svg'} className="h-12 w-12 rounded-xl object-cover" alt="" /><strong>{product.name}</strong></div></td><td>{product.base_sku}</td><td>{product.category?.name}</td><td className="price">{formatPrice(variant?.current_price ?? 0)}</td><td>{product.variants.reduce((sum, item) => sum + item.stock, 0)}</td><td>{statusLabel[product.status]}</td><td><div className="flex gap-2"><Link className="btn-secondary px-3" to={`/admin/products/${product.id}/edit`}><Edit3 size={16} /></Link><button className="btn-secondary px-3 text-red-700" onClick={() => remove(product.id)}><Trash2 size={16} /></button></div></td></tr> })}</tbody></table></div>}</div>
}
