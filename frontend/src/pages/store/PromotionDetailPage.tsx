import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, CheckCircle2, Gift, PackageCheck } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { getPromotionArticle } from '../../api/contentApi'
import { LoadingState } from '../../components/common/LoadingState'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import type { PromotionProduct } from '../../types'
import { resolveAssetUrl } from '../../utils/assetUrl'
import { useFormatPrice } from '../../utils/format'
import { NotFoundPage } from '../NotFoundPage'

const dateFormatter = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

export function PromotionDetailPage() {
  const formatPrice = useFormatPrice()
  const { slug } = useParams()
  const query = useQuery({ queryKey: ['promotion', slug], queryFn: () => getPromotionArticle(slug!), enabled: Boolean(slug), retry: false })
  const promotion = query.data
  useDocumentMeta(promotion ? (promotion.seo_title || promotion.title) : null, promotion?.seo_description ?? promotion?.excerpt ?? null)

  if (query.isLoading) return <div className='container-page py-12'><LoadingState label='Đang tải ưu đãi...' /></div>
  if (!promotion) return <NotFoundPage />

  const paragraphs = (promotion.content ?? '').split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)
  const products = (promotion.products ?? []) as PromotionProduct[]
  return <article className='promotion-detail container-page'>
    <Link to='/uu-dai' className='news-detail-back'><ArrowLeft size={17} />Quay lại ưu đãi</Link>
    <div className='promotion-detail-meta'>{promotion.promotion_badge && <strong><Gift size={15} />{promotion.promotion_badge}</strong>}{promotion.promotion_starts_at && <span>Từ {dateFormatter.format(new Date(promotion.promotion_starts_at))}</span>}{promotion.promotion_ends_at && <span>Đến {dateFormatter.format(new Date(promotion.promotion_ends_at))}</span>}</div>
    <h1>{promotion.title}</h1>
    {promotion.excerpt && <p className='promotion-detail-lead'>{promotion.excerpt}</p>}
    {promotion.cover_image_path && <div className='promotion-detail-cover'><img src={resolveAssetUrl(promotion.cover_image_path)} alt={promotion.cover_image_alt ?? promotion.title} /></div>}
    <div className='promotion-detail-layout'>
      <div className='news-detail-content'>{paragraphs.map((paragraph) => <p key={paragraph.slice(0, 40)}>{paragraph}</p>)}</div>
      <aside className='promotion-condition-card'><h2><CheckCircle2 size={20} />Điều kiện áp dụng</h2><p>{promotion.promotion_conditions}</p>{promotion.promotion_ends_at && <div><CalendarDays size={17} />Kết thúc ngày {dateFormatter.format(new Date(promotion.promotion_ends_at))}</div>}</aside>
    </div>
    <section className='promotion-products' aria-labelledby='promotion-products-heading'><div><p className='news-page-kicker'>SẢN PHẨM ÁP DỤNG</p><h2 id='promotion-products-heading'>Chọn đúng sản phẩm để nhận ưu đãi</h2><p>Chương trình này chỉ áp dụng cho các sản phẩm được liệt kê bên dưới.</p></div><div className='promotion-product-grid'>{products.map((product) => <Link className='promotion-product-card' to={`/san-pham/${product.slug}`} key={product.id}><span className='fixed-media-frame' style={{ '--media-ratio': '1 / 1' } as React.CSSProperties}><img src={resolveAssetUrl(product.image_path, '/images/product-placeholder.svg')} alt={product.name} /></span><span><strong>{product.name}</strong><small>{product.base_sku}</small><b>{formatPrice(product.price_min ?? 0)}</b><em><PackageCheck size={15} />{product.available_stock ? `Còn ${product.available_stock} sản phẩm` : 'Tạm hết hàng'}</em></span></Link>)}</div></section>
  </article>
}
