import { ArrowDown, Check, ChevronRight, Phone, Sparkles, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingState } from '../../components/common/LoadingState'
import { GuideProductCard } from '../../components/products/GuideProductCard'
import type { ApiResponse, HairGuideContent, HairGuideProduct } from '../../types'

const pagePath = '/huong-dan-chon-toc'

export function HairGuidePage() {
  const query = useQuery({ queryKey: ['hair-guide'], queryFn: async () => (await apiClient.get<ApiResponse<HairGuideContent>>('/hair-guide')).data.data })
  const [activeCategory, setActiveCategory] = useState('all')
  const [selectedProduct, setSelectedProduct] = useState<HairGuideProduct | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const content = query.data
  const categories = [...new Map((content?.products ?? []).map((item) => [item.product.category?.slug ?? 'other', item.product.category?.name ?? 'Khác'])).entries()]
  const products = (content?.products ?? []).filter((item) => activeCategory === 'all' || item.product.category?.slug === activeCategory)

  useEffect(() => {
    if (!content) return
    document.title = content.seo?.title || content.title
    const selector = 'meta[name="description"]'
    let description = document.head.querySelector<HTMLMetaElement>(selector)
    if (!description) { description = document.createElement('meta'); description.name = 'description'; document.head.append(description) }
    description.content = content.seo?.description || content.subtitle
  }, [content])

  useEffect(() => {
    if (!selectedProduct) return
    document.body.classList.add('guide-dialog-open')
    requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>('[data-guide-autofocus]')?.focus())
    const onKeyDown = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') setSelectedProduct(null) }
    window.addEventListener('keydown', onKeyDown)
    return () => { document.body.classList.remove('guide-dialog-open'); window.removeEventListener('keydown', onKeyDown) }
  }, [selectedProduct])

  const openConsultation = (item?: HairGuideProduct) => setSelectedProduct(item ?? { product: { id: 0, name: 'Tư vấn chung', slug: '', base_sku: '', description: '', status: 'active', is_featured: false, is_new: false, images: [], variants: [], rating_average: 0, reviews_count: 0 } })
  const closeConsultation = () => setSelectedProduct(null)
  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return
    const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])') ?? [])].filter((element) => !element.hasAttribute('disabled'))
    if (!focusable.length) return
    const first = focusable[0]; const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    setSubmitting(true)
    try {
      await apiClient.post('/consultation-requests', { name: form.get('name'), phone: form.get('phone'), message: form.get('message') || null, product_id: selectedProduct?.product.id || undefined, source_page: pagePath })
      toast.success('Yêu cầu tư vấn đã được gửi. LADYSTARS sẽ liên hệ sớm nhất có thể.')
      formElement.reset()
      closeConsultation()
    } catch { toast.error('Không thể gửi yêu cầu. Vui lòng kiểm tra lại thông tin.') } finally { setSubmitting(false) }
  }

  if (query.isLoading) return <main className="container-page py-16"><LoadingState /></main>
  if (query.isError || !content) return <main className="container-page py-16"><EmptyState title="Chưa thể tải hướng dẫn" description="Vui lòng thử lại sau ít phút." /></main>

  const primaryLabel = content.settings.product_primary_cta_label || 'Xem chi tiết'
  const secondaryLabel = content.settings.product_secondary_cta_label || 'Nhận tư vấn'
  return <main className="guide-page">
    <section className="container-page guide-hero-wrap"><div className="guide-hero"><div className="guide-hero-copy"><p className="guide-eyebrow"><Sparkles size={15} />{content.eyebrow}</p>{content.settings.hero_badge && <span className="guide-hero-badge">{content.settings.hero_badge}</span>}<h1>{content.title}</h1><p className="guide-hero-subtitle">{content.subtitle}</p><div className="guide-hero-actions"><button className="btn-primary" type="button" onClick={() => document.getElementById('guide-products')?.scrollIntoView({ behavior: 'smooth' })}>Khám phá lựa chọn <ArrowDown size={17} /></button><button className="btn-secondary" type="button" onClick={() => openConsultation()}>{secondaryLabel} <ChevronRight size={17} /></button></div></div><div className="guide-hero-visual">{content.hero_image_path ? <img src={content.hero_image_path} alt={content.hero_image_alt} /> : <div className="guide-hero-fallback" aria-hidden="true"><span /><span /><span /></div>}</div></div></section>

    {content.settings.trust_items?.length ? <section className="container-page guide-trust" aria-label="Điểm tin cậy">{content.settings.trust_items.map((item) => <article key={item.title}><Check size={20} /><div><h2>{item.title}</h2>{item.description && <p>{item.description}</p>}</div></article>)}</section> : null}

    <section id="guide-products" className="container-page guide-products"><div className="guide-section-heading"><p className="guide-eyebrow">LADYSTARS SELECTION</p><h2>{content.settings.guide_grid_title || 'Lựa chọn được gợi ý'}</h2><p>{content.settings.guide_grid_intro || 'Khám phá các sản phẩm được trình bày để bạn thuận tiện so sánh.'}</p></div>{categories.length > 1 && <div className="guide-filter-chips" aria-label="Lọc theo danh mục"><button className={activeCategory === 'all' ? 'is-active' : ''} type="button" onClick={() => setActiveCategory('all')}>Tất cả</button>{categories.map(([slug, label]) => <button key={slug} className={activeCategory === slug ? 'is-active' : ''} type="button" onClick={() => setActiveCategory(slug)}>{label}</button>)}</div>}{products.length ? <div className="guide-product-grid">{products.map((item) => <GuideProductCard key={item.product.id} item={item} detailLabel={primaryLabel} consultationLabel={secondaryLabel} onConsultation={openConsultation} />)}</div> : <EmptyState title="Chưa có sản phẩm phù hợp" description="Hãy chọn một danh mục khác hoặc liên hệ LADYSTARS để được tư vấn." />}</section>

    <section className="container-page guide-editorial"><div className="guide-section-heading"><p className="guide-eyebrow">CÁCH LỰA CHỌN</p><h2>{content.editorial_title}</h2><p>{content.editorial_intro}</p></div><div className="guide-editorial-grid">{content.editorial_sections.map((section, index) => <article key={section.title}><span>0{index + 1}</span><h3>{section.title}</h3><p>{section.body}</p></article>)}</div></section>

    <section className="container-page guide-consultation"><div className="guide-consultation-image">{content.consultation_image_path ? <img src={content.consultation_image_path} alt={content.consultation_image_alt} /> : <div className="guide-consultation-fallback" aria-hidden="true" />}</div><div className="guide-consultation-copy"><p className="guide-eyebrow">TƯ VẤN RIÊNG</p><h2>{content.consultation_title}</h2><p>{content.consultation_body}</p>{content.settings.consultation_benefits?.length ? <ul>{content.settings.consultation_benefits.map((benefit) => <li key={benefit}><Check size={17} />{benefit}</li>)}</ul> : null}<div className="guide-consultation-actions"><button className="btn-light" type="button" onClick={() => openConsultation()}>{content.consultation_cta_label || secondaryLabel}</button>{content.contact.support_phone && <a className="guide-phone-link" href={`tel:${content.contact.support_phone.replace(/\s/g, '')}`}><Phone size={16} />Gọi tư vấn</a>}</div></div></section>

    <button className="guide-mobile-sticky-cta" type="button" onClick={() => openConsultation()}>{secondaryLabel}</button>
    {selectedProduct && <div className="guide-dialog-backdrop" role="presentation" onMouseDown={closeConsultation}><div ref={dialogRef} className="guide-dialog" role="dialog" aria-modal="true" aria-labelledby="guide-dialog-title" onKeyDown={trapFocus} onMouseDown={(event) => event.stopPropagation()}><button data-guide-autofocus className="guide-dialog-close" type="button" onClick={closeConsultation} aria-label="Đóng tư vấn"><X size={20} /></button><p className="guide-eyebrow">LADYSTARS CARE</p><h2 id="guide-dialog-title">Nhận tư vấn phù hợp</h2><p className="guide-dialog-product">{selectedProduct.product.id ? `Sản phẩm quan tâm: ${selectedProduct.product.name}` : 'Chia sẻ nhu cầu để LADYSTARS gợi ý lựa chọn phù hợp.'}</p><form onSubmit={submit}><label><span className="label">Họ và tên</span><input className="input" name="name" required autoComplete="name" /></label><label><span className="label">Số điện thoại</span><input className="input" name="phone" required inputMode="tel" autoComplete="tel" /></label><label><span className="label">Nhu cầu (không bắt buộc)</span><textarea className="input min-h-24" name="message" /></label><button className="btn-primary mt-5 w-full" disabled={submitting}>{submitting ? 'Đang gửi...' : 'Gửi yêu cầu tư vấn'}</button></form></div></div>}
  </main>
}
