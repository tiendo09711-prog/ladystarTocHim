import { Heart, Minus, Plus, ShieldCheck, ShoppingBag, Star } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { getProduct } from '../../api/storeApi'
import { LoadingState } from '../../components/common/LoadingState'
import { useCart } from '../../stores/CartContext'
import { formatPrice } from '../../utils/format'
import { selectProductVariant } from '../../features/products/variantSelection'
import { useAuth } from '../../stores/AuthContext'
import { apiClient } from '../../api/apiClient'

export function ProductPage() {
  const { slug = '' } = useParams()
  const query = useQuery({ queryKey: ['product', slug], queryFn: () => getProduct(slug) })
  const [variantId, setVariantId] = useState<number | null>(null)
  const [quantity, setQuantity] = useState(1)
  const { addItem } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const product = query.data
  useEffect(() => { if (product?.variants[0]) setVariantId(product.variants[0].id) }, [product])
  if (query.isLoading || !product) return <div className="container-page py-10"><LoadingState /></div>
  const variant = selectProductVariant(product.variants, variantId)
  const image = product.images[0]?.image_path || '/images/product-placeholder.svg'
  const add = async (buyNow = false) => { if (!variant) return; await addItem(product, variant, quantity); toast.success('Đã thêm sản phẩm vào giỏ hàng.'); if (buyNow) navigate('/gio-hang') }
  const addWishlist = async () => { if (!user) { navigate('/dang-nhap', { state: { from: `/san-pham/${product.slug}` } }); return } await apiClient.post(`/account/wishlist/${product.id}`); toast.success('Đã thêm vào danh sách yêu thích.') }

  return <div className="container-page py-10"><div className="mb-6 text-sm text-slate-500"><Link to="/">Trang chủ</Link> / <Link to="/san-pham">Sản phẩm</Link> / {product.name}</div>
    <div className="grid gap-8 lg:grid-cols-2"><div className="card overflow-hidden bg-[#edf1ec]"><img src={image} alt={product.name} className="aspect-square w-full object-cover" /></div><div>
      <div className="text-sm font-bold uppercase tracking-wide text-emerald-700">{product.brand?.name ?? 'Nam Hair'}</div><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{product.name}</h1><div className="mt-3 flex items-center gap-3 text-sm"><span className="flex items-center gap-1 font-bold text-amber-600"><Star size={17} fill="currentColor" />{product.rating_average || 'Mới'}</span><span className="text-slate-500">{product.reviews_count} đánh giá</span><span className="text-slate-500">SKU: {variant?.sku ?? product.base_sku}</span></div>
      <div className="mt-6 flex items-center gap-3"><span className="price text-3xl">{formatPrice(variant?.current_price ?? 0)}</span>{variant?.sale_price && <span className="text-lg text-slate-400 line-through">{formatPrice(variant.price)}</span>}</div><p className="mt-4 leading-7 text-slate-600">{product.short_description}</p>
      <div className="mt-6"><div className="label">Chọn biến thể</div><div className="flex flex-wrap gap-2">{product.variants.map((item) => <button key={item.id} onClick={() => { setVariantId(item.id); setQuantity(1) }} className={item.id === variant?.id ? 'btn-primary' : 'btn-secondary'} disabled={item.stock < 1}>{item.attributes.map((attr) => attr.value).join(' · ') || item.sku}</button>)}</div></div>
      <div className="mt-5 flex items-center gap-3"><div className="flex items-center rounded-xl border bg-white"><button className="p-3" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={18} /></button><span className="min-w-10 text-center font-bold">{quantity}</span><button className="p-3" onClick={() => setQuantity(Math.min(variant?.stock ?? 1, quantity + 1))}><Plus size={18} /></button></div><span className="text-sm text-slate-500">{variant?.stock ? `Còn ${variant.stock} sản phẩm` : 'Tạm hết hàng'}</span></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2"><button className="btn-primary" onClick={() => add(false)} disabled={!variant?.stock}><ShoppingBag size={19} />Thêm vào giỏ</button><button className="btn-secondary" onClick={() => add(true)} disabled={!variant?.stock}>Mua ngay</button></div><button className="mt-3 flex items-center gap-2 font-bold text-emerald-800" onClick={addWishlist}><Heart size={19} />Thêm vào yêu thích</button>
      <div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900"><div className="flex items-center gap-2 font-bold"><ShieldCheck size={18} />Thông tin mua hàng</div><p className="mt-1">Sản phẩm được kiểm tra trước khi giao. Hỗ trợ tư vấn lựa chọn và đổi trả theo chính sách.</p></div>
    </div></div>
    <div className="mt-10 grid gap-6 lg:grid-cols-3"><section className="card p-6 lg:col-span-2"><h2 className="text-xl font-black">Mô tả sản phẩm</h2><p className="mt-4 whitespace-pre-line leading-8 text-slate-600">{product.description}</p><h3 className="mt-7 font-black">Hướng dẫn sử dụng</h3><p className="mt-2 leading-7 text-slate-600">{product.usage_instructions}</p><h3 className="mt-7 font-black">Hướng dẫn bảo quản</h3><p className="mt-2 leading-7 text-slate-600">{product.care_instructions}</p></section><aside className="card h-fit p-6"><h2 className="text-xl font-black">Thông số</h2><dl className="mt-4 grid gap-3 text-sm">{[['Chất liệu', product.material], ['Loại đế', product.base_type], ['Xuất xứ', product.origin], ['Tuổi thọ ước tính', product.estimated_lifespan], ['Bảo hành', product.warranty_information]].map(([label, value]) => <div key={label} className="border-b pb-3"><dt className="text-slate-500">{label}</dt><dd className="mt-1 font-bold">{value || 'Đang cập nhật'}</dd></div>)}</dl></aside></div>
  </div>
}
