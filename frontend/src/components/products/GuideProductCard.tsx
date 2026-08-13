import { ArrowUpRight, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { homeMediaStyle } from '../../config/homeMedia'
import type { HairGuideProduct } from '../../types'

function formatPrice(value: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)
}

export function GuideProductCard({ item, detailLabel, consultationLabel, onConsultation }: { item: HairGuideProduct; detailLabel: string; consultationLabel: string; onConsultation: (item: HairGuideProduct) => void }) {
  const { product } = item
  const image = product.images.find((value) => value.is_primary) ?? product.images[0]
  const currentPrice = product.best_listing_variant?.current_price ?? product.price_min ?? 0
  const oldPrice = product.variants.find((variant) => variant.current_price === currentPrice)?.price
  const hasSale = oldPrice && oldPrice > currentPrice

  return <article className="guide-card"><Link className="fixed-media-frame guide-card-image" style={homeMediaStyle('product')} to={`/san-pham/${product.slug}`}>{image ? <img src={image.image_path} alt={image.alt_text || product.name} /> : <span className="guide-card-placeholder" aria-label={product.name}>LS</span>}</Link><div className="guide-card-body">{item.badge && <span className="guide-card-badge">{item.badge}</span>}<p className="guide-card-category">{product.category?.name ?? 'LADYSTARS selection'}</p><Link className="guide-card-title" to={`/san-pham/${product.slug}`}>{product.name}</Link>{item.note && <p className="guide-card-note">{item.note}</p>}<div className="guide-card-price"><strong>{formatPrice(currentPrice)}</strong>{hasSale && <span>{formatPrice(oldPrice)}</span>}</div><div className="guide-card-actions"><Link className="btn-secondary" to={`/san-pham/${product.slug}`}>{detailLabel}<ArrowUpRight size={16} /></Link><button type="button" className="btn-primary" onClick={() => onConsultation(item)}><MessageCircle size={16} />{consultationLabel}</button></div></div></article>
}
