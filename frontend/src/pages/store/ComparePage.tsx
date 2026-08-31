import { useQuery } from '@tanstack/react-query'
import { GitCompareArrows, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { getProducts } from '../../api/storeApi'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingState } from '../../components/common/LoadingState'
import { compareIds, removeCompareProduct } from '../../features/products/productMemory'
import { useCart } from '../../stores/CartContext'
import { useFormatPrice } from '../../utils/format'

export function ComparePage() {
  const formatPrice = useFormatPrice()
  const [ids, setIds] = useState(compareIds)
  const { addItem } = useCart()
  useEffect(() => {
    const refresh = () => setIds(compareIds())
    window.addEventListener('ladystars:compare', refresh)
    return () => window.removeEventListener('ladystars:compare', refresh)
  }, [])
  const query = useQuery({ queryKey: ['compare-products', ids.join(',')], enabled: ids.length > 0, queryFn: () => getProducts({ ids: ids.join(','), per_page: 4 }) })
  const products = [...(query.data?.data ?? [])].sort((left, right) => ids.indexOf(left.id) - ids.indexOf(right.id))
  const remove = (id: number) => removeCompareProduct(id)
  const addToCart = async (product: (typeof products)[number]) => {
    const purchasable = product.variants.filter((variant) => variant.status === 'active' && variant.stock > 0)
    if (purchasable.length !== 1) return
    await addItem(product, purchasable[0], 1)
    toast.success('Đã thêm sản phẩm vào giỏ hàng.')
  }
  if (query.isLoading) return <div className='container-page py-12'><LoadingState /></div>

  return <div className='container-page py-12'><div className='mb-8'><p className='text-xs font-black uppercase tracking-[.2em] text-emerald-700'>Lựa chọn thông minh</p><h1 className='mt-2 flex items-center gap-3 text-3xl font-black'><GitCompareArrows />So sánh sản phẩm</h1><p className='muted mt-2'>So sánh tối đa 4 sản phẩm theo dữ liệu đang có.</p></div>{products.length ? <div className='overflow-x-auto rounded-2xl border bg-white'><table className='min-w-[760px] w-full border-collapse text-sm'><tbody>
    <CompareRow label='Sản phẩm'>{products.map((product) => <div className='grid gap-3' key={product.id}><img className='h-40 w-full rounded-xl object-cover' src={product.images[0]?.image_path || '/images/product-placeholder.svg'} alt={product.name} /><strong>{product.name}</strong></div>)}</CompareRow>
    <CompareRow label='Giá'>{products.map((product) => <span className='price' key={product.id}>{product.price_min === product.price_max ? formatPrice(product.price_min ?? 0) : `${formatPrice(product.price_min ?? 0)} – ${formatPrice(product.price_max ?? 0)}`}</span>)}</CompareRow>
    <CompareRow label='Đánh giá'>{products.map((product) => <span key={product.id}>{product.rating_average || 'Mới'} ({product.reviews_count})</span>)}</CompareRow>
    <CompareRow label='Chất liệu'>{products.map((product) => <span key={product.id}>{product.material || '—'}</span>)}</CompareRow>
    <CompareRow label='Kiểu đế'>{products.map((product) => <span key={product.id}>{product.base_type || '—'}</span>)}</CompareRow>
    <CompareRow label='Xuất xứ'>{products.map((product) => <span key={product.id}>{product.origin || '—'}</span>)}</CompareRow>
    <CompareRow label='Bảo hành'>{products.map((product) => <span key={product.id}>{product.warranty_information || (product.warranty_days ? `${product.warranty_days} ngày` : '—')}</span>)}</CompareRow>
    <CompareRow label='Phân loại'>{products.map((product) => <span key={product.id}>{product.variants.flatMap((variant) => variant.attributes.map((attribute) => attribute.value)).filter((value, index, values) => values.indexOf(value) === index).join(' · ') || '—'}</span>)}</CompareRow>
    <CompareRow label='Tồn kho'>{products.map((product) => <span key={product.id}>{(product.available_stock ?? 0) > 0 ? `Còn ${product.available_stock}` : 'Tạm hết hàng'}</span>)}</CompareRow>
    <CompareRow label='Thao tác'>{products.map((product) => { const purchasable = product.variants.filter((variant) => variant.status === 'active' && variant.stock > 0); return <div className='grid gap-2' key={product.id}><Link className='btn-primary justify-center' to={`/san-pham/${product.slug}`}>Xem chi tiết</Link>{purchasable.length === 1 ? <button className='btn-secondary' onClick={() => void addToCart(product)}>Thêm vào giỏ</button> : <Link className='btn-secondary justify-center' to={`/san-pham/${product.slug}`}>Chọn phân loại</Link>}<button className='flex items-center justify-center gap-2 text-sm font-bold text-red-700' onClick={() => remove(product.id)}><Trash2 size={16} />Xóa so sánh</button></div> })}</CompareRow>
  </tbody></table></div> : <EmptyState title='Chưa có sản phẩm để so sánh' description='Thêm sản phẩm từ danh sách hoặc trang chi tiết.' />}</div>
}

function CompareRow({ label, children }: { label: string; children: React.ReactNode[] }) {
  return <tr className='border-b last:border-0'><th className='w-36 bg-slate-50 p-4 text-left align-top font-black'>{label}</th>{children.map((child, index) => <td className='min-w-52 border-l p-4 align-top' key={index}>{child}</td>)}</tr>
}
