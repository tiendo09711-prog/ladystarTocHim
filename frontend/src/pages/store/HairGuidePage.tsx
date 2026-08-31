import { Check, ChevronRight, Phone } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getHairGuide } from '../../api/contentApi'
import { ServiceCard } from '../../components/services/ServiceCard'
import { ConsultationDialog } from '../../components/store/ConsultationDialog'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import type { Service } from '../../types'

const phoneHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`

function ServicePageSkeleton() {
  return <main className="service-page" aria-label="Đang tải dịch vụ"><div className="container-page">
    <div className="service-breadcrumb service-skeleton-line" />
    <section className="service-hero service-skeleton"><div /><div /></section>
    <div className="service-skeleton-title" />
    <div className="service-grid">{Array.from({ length: 6 }, (_, index) => <div className="service-card service-skeleton-card" key={index}><div /><div /></div>)}</div>
  </div></main>
}

export function HairGuidePage() {
  const query = useQuery({ queryKey: ['hair-guide'], queryFn: getHairGuide })
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [generalOpen, setGeneralOpen] = useState(false)
  const content = query.data

  useDocumentMeta(content?.seo?.title ?? content?.title ?? null, content?.seo?.description ?? content?.subtitle ?? null)

  if (query.isLoading) return <ServicePageSkeleton />
  if (query.isError || !content) return <main className="service-page"><div className="container-page service-state"><h1>Chưa thể tải danh sách dịch vụ.</h1><p>Vui lòng thử lại sau.</p><button className="btn-primary" type="button" onClick={() => void query.refetch()}>Thử lại</button></div></main>

  const hotline = content.contact.support_phone
  const appointmentsEnabled = content.contact.appointments_enabled
  const closeDialog = () => { setSelectedService(null); setGeneralOpen(false) }
  return <main className="service-page"><div className="container-page">
    <nav className="service-breadcrumb" aria-label="Breadcrumb"><Link to="/">Trang chủ</Link><ChevronRight size={15} /><span>{content.title}</span></nav>
    <section className="service-hero">
      <div className="service-hero-media">{content.hero_image_path ? <img src={content.hero_image_path} alt={content.hero_image_alt} /> : <div className="service-hero-placeholder" aria-hidden="true" />}</div>
      <div className="service-hero-copy">{content.eyebrow && <p>{content.eyebrow}</p>}<h1>{content.title}</h1><div className="service-hero-rule" /><p className="service-hero-subtitle">{content.subtitle}</p>{hotline && <a href={phoneHref(hotline)}><Phone size={17} />Tư vấn: {hotline}</a>}</div>
    </section>
    <section className="service-list" aria-labelledby="service-list-title">
      <div className="service-section-heading"><h2 id="service-list-title">{content.settings.guide_grid_title || content.title}</h2>{content.settings.guide_grid_intro && <span>{content.settings.guide_grid_intro}</span>}</div>
      {content.services.length ? <div className="service-grid">{content.services.map((service) => <ServiceCard key={service.id} service={service} hotline={hotline} bookingEnabled={appointmentsEnabled} onBook={setSelectedService} />)}</div> : <div className="service-state"><h3>Hiện chưa có dịch vụ.</h3><p>Nội dung sẽ xuất hiện sau khi được cấu hình.</p>{hotline && <a className="btn-primary" href={phoneHref(hotline)}><Phone size={17} />Liên hệ tư vấn</a>}</div>}
    </section>
    {content.editorial_sections.length > 0 && <section className="service-editorial"><div>{content.eyebrow && <p className="guide-eyebrow">{content.eyebrow}</p>}<h2>{content.editorial_title}</h2><p>{content.editorial_intro}</p></div><div>{content.editorial_sections.slice(0, 4).map((section) => <article key={section.title}><Check size={18} /><div><h3>{section.title}</h3><p>{section.body}</p></div></article>)}</div></section>}
    {(content.consultation_title || hotline) && <section className="service-consultation"><div>{content.eyebrow && <p className="guide-eyebrow">{content.eyebrow}</p>}<h2>{content.consultation_title}</h2><p>{content.consultation_body}</p></div><div className="service-consultation-actions">{appointmentsEnabled && content.consultation_cta_label && <button type="button" className="btn-light" onClick={() => setGeneralOpen(true)}>{content.consultation_cta_label}</button>}{hotline && <a href={phoneHref(hotline)}><Phone size={17} />{hotline}</a>}</div></section>}
  </div>{appointmentsEnabled && <ConsultationDialog open={selectedService !== null || generalOpen} onClose={closeDialog} service={selectedService} hotline={hotline} />}</main>
}
