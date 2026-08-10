import { PackageCheck, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { homeMediaStyle } from '../../config/homeMedia'
import type { Product } from '../../types'
import { formatPrice } from '../../utils/format'

export function ProductCard({ product, variant = 'default' }: { product: Product; variant?: 'default' | 'catalog' }) {
  const listing = product.best_listing_variant ?? product.variants?.[0]
  const pricedVariant = product.variants.find((item) => item.id === listing?.id) ?? product.variants[0]
  const image = product.images?.find((item) => item.is_primary) ?? product.images?.[0]
  const currentPrice = product.price_min ?? listing?.current_price ?? 0
  const oldPrice = pricedVariant?.sale_price ? pricedVariant.price : undefined
  const discount = oldPrice && currentPrice ? Math.round((1 - currentPrice / oldPrice) * 100) : 0
  const stock = product.available_stock ?? product.variants.reduce((total, item) => total + item.stock, 0)
  return <article className={`card product-card group h-full min-h-0 min-w-0 overflow-hidden ${variant === 'catalog' ? 'flex flex-col' : ''}`}>
    <Link to={`/san-pham/${product.slug}`} className="fixed-media-frame product-card-image block" style={homeMediaStyle('product')}><img src={image?.image_path || '/images/product-placeholder.svg'} alt={image?.alt_text || product.name} className="transition duration-300 group-hover:scale-[1.03]" loading="lazy" decoding="async" onError={(event) => { if (!event.currentTarget.src.endsWith('/images/product-placeholder.svg')) event.currentTarget.src = '/images/product-placeholder.svg' }} /></Link>
    <div className={`p-4 ${variant === 'catalog' ? 'flex flex-1 flex-col' : ''}`}><div className="mb-2 flex items-start justify-between gap-3"><span className="product-card-category text-xs font-bold uppercase tracking-wide">{product.category?.name}</span>{product.is_new && <span className="rounded-full bg-rose-100 px-2 py-1 text-[11px] font-black text-rose-800">Mới</span>}</div><Link to={`/san-pham/${product.slug}`} className="line-clamp-2 min-h-12 font-bold hover:text-[var(--color-brand)]">{product.name}</Link>{product.reviews_count > 0 && <div className="mt-2 flex items-center gap-1 text-xs text-amber-700"><Star size={14} fill="currentColor" />{product.rating_average} ({product.reviews_count})</div>}<div className="mt-3 flex flex-wrap items-center gap-2"><span className="price">{product.price_max && product.price_max !== currentPrice ? `Từ ${formatPrice(currentPrice)}` : formatPrice(currentPrice)}</span>{oldPrice && <span className="text-sm text-slate-400 line-through">{formatPrice(oldPrice)}</span>}{discount > 0 && <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-700">-{discount}%</span>}</div><div className="product-card-stock mt-3 flex items-center gap-2 text-sm"><PackageCheck size={16} />{stock > 0 ? `Còn ${stock} sản phẩm` : 'Tạm hết hàng'}</div>{variant === 'catalog' && <Link className="btn-secondary mt-4 justify-center" to={`/san-pham/${product.slug}`}>Xem chi tiết</Link>}</div>
  </article>
}
