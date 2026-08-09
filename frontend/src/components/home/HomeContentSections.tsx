import { Fragment, useEffect, useRef, useState } from 'react'
import { ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, MessageCircle, MoveUpRight, Sparkles, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { HomePageSections } from '../../types'
import { resolveAssetUrl } from '../../utils/assetUrl'

export function BrandStory({ content, imagePath }: { content: HomePageSections['brand_story']; imagePath?: string | null }) {
  return <section className="home-story-section">
    <div className="container-page home-story-grid">
      <div className="home-story-image"><img src={resolveAssetUrl(imagePath, '/images/brand/ladystars-hero.svg')} alt={content.image_alt} /></div>
      <div className="home-story-copy">
        <p className="home-kicker">{content.kicker}</p>
        <h2>{content.title}</h2>
        <p>{content.description}</p>
        <div className="home-value-grid">{content.values.map((item) => <div key={item.title}><Check size={18} /><div><h3>{item.title}</h3><p>{item.description}</p></div></div>)}</div>
        <Link to={content.cta_url} className="btn-secondary">{content.cta_label} <ArrowRight size={18} /></Link>
      </div>
    </div>
  </section>
}

export function SolutionsAndStyles({ solutions, styles }: { solutions: HomePageSections['solutions']; styles: HomePageSections['styles'] }) {
  return <>
    <section className="container-page home-section home-solution-grid">
      <div className="home-solution-copy">
        <p className="home-kicker">{solutions.kicker}</p>
        <h2>{solutions.title}</h2>
        <p>{solutions.description}</p>
        <ul>{solutions.bullets.map((item) => <li key={item}><Check size={18} />{item}</li>)}</ul>
        <Link to={solutions.cta_url} className="btn-primary">{solutions.cta_label} <ArrowRight size={18} /></Link>
      </div>
      <div className={`home-solution-art ${solutions.image_path ? 'has-image' : ''}`}>
        {solutions.image_path && <img src={resolveAssetUrl(solutions.image_path)} alt={solutions.image_alt} />}
        {!solutions.image_path && <><span>L</span><span>S</span></>}
        <p>{solutions.art_text.split('\n').map((line, index) => <Fragment key={line}>{index > 0 && <br />}{line}</Fragment>)}</p>
      </div>
    </section>
    <section className="container-page home-section" aria-labelledby="style-inspiration-title">
      <div className="home-section-heading"><p className="home-kicker"><Sparkles size={15} /> {styles.kicker}</p><h2 id="style-inspiration-title">{styles.title}</h2></div>
      <div className="home-style-grid">{styles.items.map((item, index) => <Link to={item.url} className={`home-style-card home-style-card-${index + 1} ${item.image_path ? 'has-image' : ''}`} key={item.title}>{item.image_path && <img src={resolveAssetUrl(item.image_path)} alt={item.image_alt} />}<span>0{index + 1}</span><div><h3>{item.title}</h3><p>{item.description}</p><strong>Khám phá <MoveUpRight size={17} /></strong></div></Link>)}</div>
    </section>
  </>
}

export function ServiceProcess({ content }: { content: HomePageSections['process'] }) {
  return <section className="home-process-section">
    <div className="container-page">
      <div className="home-section-heading home-section-heading-center"><p className="home-kicker">{content.kicker}</p><h2>{content.title}</h2><p>{content.description}</p></div>
      <div className="home-process-grid">{content.steps.map((step) => <article className={step.image_path ? 'has-image' : ''} key={`${step.number}-${step.title}`}>{step.image_path && <img src={resolveAssetUrl(step.image_path)} alt={step.image_alt} />}<div><span>{step.number}</span><h3>{step.title}</h3><p>{step.description}</p></div></article>)}</div>
      <div className="home-center-action"><Link to={content.cta_url} className="btn-primary">{content.cta_label} <CalendarDays size={18} /></Link></div>
    </div>
  </section>
}

export function Testimonials({ content }: { content: HomePageSections['testimonials'] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const activeTestimonial = content.items[activeIndex] ?? content.items[0]
  const selectedTestimonial = selectedIndex === null ? null : content.items[selectedIndex]
  const showPrevious = () => setActiveIndex((index) => (index - 1 + content.items.length) % content.items.length)
  const showNext = () => setActiveIndex((index) => (index + 1) % content.items.length)

  useEffect(() => {
    if (!selectedTestimonial) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelectedIndex(null) }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [selectedTestimonial])

  if (!activeTestimonial) return null

  return <section className="container-page home-section" aria-labelledby="testimonial-title">
    <div className="home-section-heading home-testimonial-heading"><div><p className="home-kicker">{content.kicker}</p><h2 id="testimonial-title">{content.title}</h2></div><div className="home-carousel-controls"><button type="button" onClick={showPrevious} aria-label="Xem cảm nhận trước"><ChevronLeft size={20} /></button><button type="button" onClick={showNext} aria-label="Xem cảm nhận tiếp theo"><ChevronRight size={20} /></button></div></div>
    <div className="home-testimonial-grid">{content.items.map((item, index) => <button type="button" className={index === activeIndex ? 'is-active' : ''} key={`${item.quote}-${item.customer}`} onClick={() => setSelectedIndex(index)} aria-label={`Đọc cảm nhận: ${item.detail_title}`}>{item.image_path && <img src={resolveAssetUrl(item.image_path)} alt={item.image_alt} />}<span>“</span><p>{item.quote}</p><strong>{item.customer}</strong><small>{item.label}</small><em>Đọc câu chuyện</em></button>)}</div>
    <button type="button" className="home-testimonial-mobile" onClick={() => setSelectedIndex(activeIndex)} aria-label={`Đọc cảm nhận: ${activeTestimonial.detail_title}`}>{activeTestimonial.image_path && <img src={resolveAssetUrl(activeTestimonial.image_path)} alt={activeTestimonial.image_alt} />}<span>“</span><p>{activeTestimonial.quote}</p><strong>{activeTestimonial.customer}</strong><small>{activeTestimonial.label}</small><em>Đọc câu chuyện</em></button>
    {selectedTestimonial && <div className="home-testimonial-dialog-backdrop" role="presentation" onMouseDown={() => setSelectedIndex(null)}><article className="home-testimonial-dialog" role="dialog" aria-modal="true" aria-labelledby="home-testimonial-dialog-title" onMouseDown={(event) => event.stopPropagation()}><button ref={closeButtonRef} type="button" className="home-testimonial-dialog-close" onClick={() => setSelectedIndex(null)} aria-label="Đóng bài cảm nhận"><X size={20} /></button>{selectedTestimonial.image_path && <img src={resolveAssetUrl(selectedTestimonial.image_path)} alt={selectedTestimonial.image_alt} />}<div><p className="home-kicker">{selectedTestimonial.label}</p><h2 id="home-testimonial-dialog-title">{selectedTestimonial.detail_title}</h2><blockquote>“{selectedTestimonial.quote}”</blockquote><p className="home-testimonial-dialog-detail">{selectedTestimonial.detail}</p><strong>{selectedTestimonial.customer}</strong></div></article></div>}
  </section>
}

export function ContactAndInsights({ contact, insights }: { contact: HomePageSections['contact']; insights: HomePageSections['insights'] }) {
  return <>
    <section className="home-contact-section"><div className="container-page home-contact-grid"><div><p className="home-kicker">{contact.kicker}</p><h2>{contact.title}</h2><p>{contact.description}</p></div><div className="home-contact-cards">{contact.cards.map((item, index) => <Link to={item.url} key={item.title}>{index === 0 ? <CalendarDays size={23} /> : <MessageCircle size={23} />}<div><h3>{item.title}</h3><p>{item.description}</p></div><ArrowRight size={19} /></Link>)}</div></div></section>
    <section className="container-page home-section" aria-labelledby="insights-title"><div className="home-section-heading home-section-heading-center"><p className="home-kicker">{insights.kicker}</p><h2 id="insights-title">{insights.title}</h2></div><div className="home-insight-grid">{insights.items.map((item, index) => <Link to={item.url} key={item.title} className={index === 0 ? 'is-featured' : ''}><span>0{index + 1}</span><h3>{item.title}</h3><p>{item.description}</p><strong>Đọc thêm <ArrowRight size={17} /></strong></Link>)}</div></section>
  </>
}

export function HomeFinalCta({ content }: { content: HomePageSections['final_cta'] }) {
  return <section className="container-page home-final-cta"><div><p className="home-kicker">{content.kicker}</p><h2>{content.title}</h2><p>{content.description}</p></div><div><Link to={content.primary_url} className="btn-light">{content.primary_label} <CalendarDays size={18} /></Link><Link to={content.secondary_url} className="home-cta-text-link">{content.secondary_label} <ArrowRight size={18} /></Link></div></section>
}

export function FloatingContactDock({ content }: { content: HomePageSections['floating_contact'] }) {
  const [open, setOpen] = useState(false)

  return <div className={`home-contact-dock ${open ? 'is-open' : ''}`}>
    <div className="home-contact-dock-links"><Link to={content.consultation_url} aria-label={content.consultation_label}><CalendarDays size={19} /></Link><Link to={content.guide_url} aria-label={content.guide_label}><MessageCircle size={19} /></Link><button type="button" aria-label="Trở về đầu trang" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>↑</button></div>
    <button type="button" className="home-contact-dock-trigger" aria-label={`Mở ${content.trigger_label.toLocaleLowerCase('vi-VN')}`} aria-expanded={open} onClick={() => setOpen((current) => !current)}><MessageCircle size={20} /><span>{content.trigger_label}</span></button>
  </div>
}
