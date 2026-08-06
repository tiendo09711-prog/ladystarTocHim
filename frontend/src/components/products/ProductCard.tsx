import { Heart, PackageCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Product } from '../../types'
import { formatPrice } from '../../utils/format'

export function ProductCard({ product }: { product: Product }) {
  const variant = product.variants?.[0]
  const image = product.images?.[0]?.image_path || '/images/product-placeholder.svg'
  const discount = variant?.sale_price ? Math.round((1 - variant.sale_price / variant.price) * 100) : 0
  return <article className="card group overflow-hidden">
    <Link to={`/san-pham/${product.slug}`} className="block aspect-square overflow-hidden bg-[#edf1ec]">
      <img src={image} alt={product.images?.[0]?.alt_text || product.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
    </Link>
    <div className="p-4">
      <div className="mb-2 flex items-start justify-between gap-3"><span className="text-xs font-bold uppercase tracking-wide text-emerald-700">{product.category?.name}</span><Heart size={18} className="text-slate-400" aria-label="Yêu thích" /></div>
      <Link to={`/san-pham/${product.slug}`} className="line-clamp-2 min-h-12 font-bold hover:text-emerald-800">{product.name}</Link>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="price">{formatPrice(variant?.current_price ?? 0)}</span>
        {variant?.sale_price && <span className="text-sm text-slate-400 line-through">{formatPrice(variant.price)}</span>}
        {discount > 0 && <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-700">-{discount}%</span>}
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm text-slate-600"><PackageCheck size={16} />{variant?.stock ? `Còn ${variant.stock} sản phẩm` : 'Tạm hết hàng'}</div>
    </div>
  </article>
}
