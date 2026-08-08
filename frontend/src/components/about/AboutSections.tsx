import { ArrowRight, BadgeCheck, CalendarDays, Compass, Gem, HandHeart, Heart, Leaf, MessagesSquare, Quote, Scissors, ShieldCheck, Sparkles, Star, Users, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { AboutSection, AboutSectionItem } from '../../types'
import { resolveAssetUrl } from '../../utils/assetUrl'

const iconMap: Record<string, LucideIcon> = {
  heart: Heart, sparkles: Sparkles, gem: Gem, 'shield-check': ShieldCheck, leaf: Leaf, scissors: Scissors,
  star: Star, users: Users, compass: Compass, 'hand-heart': HandHeart, 'messages-square': MessagesSquare, 'badge-check': BadgeCheck,
}

export function AboutIcon({ name, size = 20 }: { name?: string; size?: number }) {
  const Icon = (name && iconMap[name]) || Sparkles
  return <Icon size={size} aria-hidden="true" />
}

const paragraphs = (text?: string | null) => (text ?? '').split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)

function SectionHeading({ eyebrow, title, subtitle, dark = false }: { eyebrow?: string | null; title?: string | null; subtitle?: string | null; dark?: boolean }) {
  return <div className={`about-section-heading ${dark ? 'about-section-heading-dark' : ''}`}>
    {eyebrow && <p className="home-kicker">{eyebrow}</p>}
    {title && <h2>{title}</h2>}
    {subtitle && <p>{subtitle}</p>}
  </div>
}

export function AboutHero({ section }: { section: AboutSection }) {
  const settings = section.settings ?? {}
  return <section className="about-hero container-page" aria-labelledby="about-hero-title">
    <div className="about-hero-copy">
      {section.eyebrow && <p className="home-kicker"><Sparkles size={15} />{section.eyebrow}</p>}
      <h1 id="about-hero-title">{section.title}</h1>
      {section.subtitle && <p className="about-hero-subtitle">{section.subtitle}</p>}
      <div className="about-hero-actions">
        {section.cta_label && section.cta_url && <Link to={section.cta_url} className="btn-primary">{section.cta_label} <ArrowRight size={18} /></Link>}
        {settings.secondary_cta_label && settings.secondary_cta_url && <Link to={settings.secondary_cta_url} className="btn-secondary">{settings.secondary_cta_label} <CalendarDays size={18} /></Link>}
      </div>
      {settings.trust_items && settings.trust_items.length > 0 && <ul className="about-hero-trust">
        {settings.trust_items.map((item) => <li key={item}><BadgeCheck size={16} />{item}</li>)}
      </ul>}
    </div>
    {section.image_path && <div className="about-hero-visual">
      <img src={resolveAssetUrl(section.image_path)} alt={section.image_alt ?? ''} />
      {settings.image_badge && <div className="about-hero-badge">{settings.image_badge}</div>}
    </div>}
  </section>
}

export function AboutStoryBlock({ section }: { section: AboutSection }) {
  const settings = section.settings ?? {}
  const imageLeft = settings.layout !== 'image-right'
  return <section className="about-story container-page" aria-labelledby={`about-${section.section_key}`}>
    {section.image_path && <div className={`about-story-visual ${imageLeft ? '' : 'about-story-visual-right'}`}>
      <img src={resolveAssetUrl(section.image_path)} alt={section.image_alt ?? ''} loading="lazy" />
      {settings.floating_card?.title && <div className="about-story-card"><strong>{settings.floating_card.title}</strong><span>{settings.floating_card.subtitle}</span></div>}
    </div>}
    <div className="about-story-copy">
      {section.eyebrow && <p className="home-kicker">{section.eyebrow}</p>}
      {section.title && <h2 id={`about-${section.section_key}`}>{section.title}</h2>}
      {paragraphs(section.body).map((paragraph) => <p key={paragraph.slice(0, 32)}>{paragraph}</p>)}
      {settings.quote && <blockquote className="about-story-quote"><Quote size={18} aria-hidden="true" />{settings.quote}</blockquote>}
      {settings.pills && settings.pills.length > 0 && <ul className="about-story-pills">{settings.pills.map((pill) => <li key={pill}>{pill}</li>)}</ul>}
      {settings.steps && settings.steps.length > 0 && <ol className="about-story-steps">{settings.steps.map((step) => <li key={step.label}><span>{step.label}</span>{step.title}</li>)}</ol>}
    </div>
  </section>
}

export function AboutTimeline({ section }: { section: AboutSection }) {
  const items = section.settings?.items ?? []
  return <section className="about-process" aria-labelledby={`about-${section.section_key}`}>
    <div className="container-page">
      <SectionHeading eyebrow={section.eyebrow} title={section.title} subtitle={section.subtitle} dark />
      <ol className="about-process-track">
        {items.map((item, index) => <li key={item.title ?? index}>
          <span className="about-process-number">{String(index + 1).padStart(2, '0')}</span>
          <span className="about-process-dot"><AboutIcon name={item.icon} size={22} /></span>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
        </li>)}
      </ol>
    </div>
  </section>
}

export function AboutShowcase({ section }: { section: AboutSection }) {
  const settings = section.settings ?? {}
  const items = settings.items ?? []
  return <section className="about-showcase container-page" aria-labelledby={`about-${section.section_key}`}>
    <SectionHeading eyebrow={section.eyebrow} title={section.title} subtitle={section.subtitle} />
    {section.image_path && <div className="about-showcase-visual">
      <img src={resolveAssetUrl(section.image_path)} alt={section.image_alt ?? ''} loading="lazy" />
      {settings.caption_title && <div className="about-showcase-caption"><strong>{settings.caption_title}</strong><span>{settings.caption_subtitle}</span></div>}
    </div>}
    {items.length > 0 && <div className="about-showcase-grid">
      {items.map((item) => <article key={item.title} className="about-showcase-card"><AboutIcon name={item.icon} /><h3>{item.title}</h3><p>{item.description}</p></article>)}
    </div>}
  </section>
}

export function AboutCommitments({ section }: { section: AboutSection }) {
  const items = section.settings?.items ?? []
  return <section className="about-commitments container-page" aria-labelledby={`about-${section.section_key}`}>
    <SectionHeading eyebrow={section.eyebrow} title={section.title} subtitle={section.subtitle} />
    <div className="about-commitments-grid">
      {items.map((item) => <article key={item.title} className="about-commitment-card"><span className="about-commitment-icon"><AboutIcon name={item.icon} size={22} /></span><h3>{item.title}</h3><p>{item.description}</p></article>)}
    </div>
  </section>
}

export function AboutGoals({ section }: { section: AboutSection }) {
  const items = section.settings?.items ?? []
  return <section className="about-goals container-page" aria-labelledby={`about-${section.section_key}`}>
    <SectionHeading eyebrow={section.eyebrow} title={section.title} subtitle={section.subtitle} />
    <ol className="about-goals-list">
      {items.map((item, index) => <li key={item.title ?? index}>
        <span className="about-goals-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
        <article className="about-goals-card"><AboutIcon name={item.icon} /><h3>{item.title}</h3><p>{item.description}</p></article>
      </li>)}
    </ol>
  </section>
}

function TestimonialCard({ item }: { item: AboutSectionItem }) {
  return <article className="about-testimonial-card">
    <div className="about-testimonial-stars" aria-label={`${item.rating ?? 5} trên 5 sao`}>{Array.from({ length: item.rating ?? 5 }).map((_, index) => <Star key={index} size={15} fill="currentColor" aria-hidden="true" />)}</div>
    <p>{item.quote}</p>
    <div className="about-testimonial-author"><span className="about-testimonial-avatar" aria-hidden="true">{(item.name ?? 'L').charAt(0)}</span><div><strong>{item.name}</strong><small>{item.role}</small></div></div>
  </article>
}

export function AboutTestimonials({ section }: { section: AboutSection }) {
  const items = section.settings?.items ?? []
  return <section className="about-testimonials container-page" aria-labelledby={`about-${section.section_key}`}>
    <SectionHeading eyebrow={section.eyebrow} title={section.title} subtitle={section.subtitle} />
    <div className="about-testimonials-grid">{items.map((item, index) => <TestimonialCard key={item.name ?? index} item={item} />)}</div>
  </section>
}

export function AboutFinalCta({ section }: { section: AboutSection }) {
  const settings = section.settings ?? {}
  return <section className="container-page about-final-cta-wrap" aria-labelledby={`about-${section.section_key}`}>
    <div className="about-final-cta">
      {section.eyebrow && <p className="home-kicker">{section.eyebrow}</p>}
      <h2 id={`about-${section.section_key}`}>{section.title}</h2>
      {section.subtitle && <p>{section.subtitle}</p>}
      <div className="about-final-cta-actions">
        {section.cta_label && section.cta_url && <Link to={section.cta_url} className="btn-primary">{section.cta_label} <CalendarDays size={18} /></Link>}
        {settings.secondary_cta_label && settings.secondary_cta_url && <Link to={settings.secondary_cta_url} className="btn-secondary">{settings.secondary_cta_label} <ArrowRight size={18} /></Link>}
      </div>
    </div>
  </section>
}
