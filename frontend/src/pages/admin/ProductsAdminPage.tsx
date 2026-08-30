import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Clipboard, CopyPlus, Edit3, Plus, Trash2 } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { PermissionGate } from '../../components/admin/PermissionGate'
import { LoadingState } from '../../components/common/LoadingState'
import type { ApiResponse, Product } from '../../types'
import { copyText } from '../../utils/browserActions'
import { formatPrice, statusLabel } from '../../utils/format'

interface ProductListResponse { data: Product[]; meta: { total: number; current_page: number; last_page: number } }

export function ProductsAdminPage() {
  const client = useQueryClient()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const filters = { search: params.get('search') || undefined, status: params.get('status') || undefined, page: params.get('page') || undefined }
  const query = useQuery({ queryKey: ['admin-products', filters], queryFn: async () => (await apiClient.get<ApiResponse<ProductListResponse>>('/admin/products', { params: filters })).data.data })
  const remove = async (id: number) => { if (!confirm('Xóa mềm sản phẩm này?')) return; await apiClient.delete(`/admin/products/${id}`); await client.invalidateQueries({ queryKey: ['admin-products'] }); toast.success('Đã xóa sản phẩm.') }
  const duplicate = async (product: Product) => { if (!confirm(`Nhân bản ${product.name}? Tồn kho sẽ không được sao chép.`)) return; const response = await apiClient.post<ApiResponse<Product>>(`/admin/products/${product.id}/duplicate`); toast.success('Đã tạo bản sao ở trạng thái nháp.'); navigate(`/admin/products/${response.data.data.id}/edit`) }
  const updateFilter = (key: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); next.delete('page'); setParams(next) }

  return <div><div className='mb-6 flex flex-wrap items-center justify-between gap-3'><div><h1 className='text-3xl font-black'>Sản phẩm</h1><p className='muted'>Quản lý thông tin, giá và biến thể sản phẩm.</p></div><PermissionGate permission='products.manage'><Link className='btn-primary' to='/admin/products/create'><Plus size={18} />Thêm sản phẩm</Link></PermissionGate></div><div className='card mb-5 grid gap-3 p-4 md:grid-cols-[1fr_220px]'><input className='input' placeholder='Tìm tên hoặc SKU' value={params.get('search') ?? ''} onChange={(event) => updateFilter('search', event.target.value)} /><select className='input' value={params.get('status') ?? ''} onChange={(event) => updateFilter('status', event.target.value)}><option value=''>Tất cả trạng thái</option><option value='draft'>Bản nháp</option><option value='active'>Đang hoạt động</option><option value='inactive'>Đã ẩn</option></select></div>{query.isLoading ? <LoadingState /> : <div className='table-wrap'><table className='table'><thead><tr><th>Sản phẩm</th><th>SKU</th><th>Danh mục</th><th>Giá</th><th>Tồn kho</th><th>Trạng thái</th><th>Hành động</th></tr></thead><tbody>{query.data?.data.map((product) => { const variant = product.variants[0]; return <tr key={product.id}><td><div className='flex items-center gap-3'><img src={product.images[0]?.image_path || '/images/product-placeholder.svg'} className='h-12 w-12 rounded-xl object-cover' alt='' /><strong>{product.name}</strong></div></td><td><div className='flex items-center gap-2'>{product.base_sku}<button aria-label='Sao chép SKU' onClick={() => void copyText(product.base_sku).then(() => toast.success('Đã sao chép'))}><Clipboard size={14} /></button></div></td><td>{product.category?.name}</td><td className='price'>{formatPrice(variant?.current_price ?? 0)}</td><td>{product.variants.reduce((sum, item) => sum + item.stock, 0)}</td><td>{statusLabel[product.status]}</td><td><PermissionGate permission='products.manage' fallback={<span className='text-sm text-slate-400'>Chỉ xem</span>}><div className='flex gap-2'><Link className='btn-secondary px-3' to={`/admin/products/${product.id}/edit`} aria-label='Sửa sản phẩm'><Edit3 size={16} /></Link><button className='btn-secondary px-3' aria-label='Nhân bản sản phẩm' onClick={() => void duplicate(product)}><CopyPlus size={16} /></button><button className='btn-secondary px-3 text-red-700' aria-label='Xóa sản phẩm' onClick={() => void remove(product.id)}><Trash2 size={16} /></button></div></PermissionGate></td></tr> })}</tbody></table></div>}</div>
}
