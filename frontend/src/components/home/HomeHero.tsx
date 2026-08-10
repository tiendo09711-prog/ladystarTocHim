import { ArrowRight, CalendarDays, Check, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { HomePageSections } from '../../types'
import { FixedMediaFrame } from '../common/FixedMediaFrame'

export function HomeHero({ content, imagePath, imageAlt }: { content: HomePageSections['hero']; imagePath?: string | null; imageAlt?: string | null }) {
  return <section className="home-hero-shell" aria-labelledby="home-hero-title">
    <div className="home-hero container-page">
      <div className="home-hero-copy">
        <div className="home-eyebrow"><Sparkles size={16} /> {content.eyebrow}</div>
        <h1 id="home-hero-title">{content.title}</h1>
        <p>{content.description}</p>
        <div className="home-hero-actions">
          <Link to={content.primary_url} className="btn-primary">{content.primary_label} <ArrowRight size={18} /></Link>
          <Link to={content.secondary_url} className="btn-secondary">{content.secondary_label} <CalendarDays size={18} /></Link>
        </div>
        <ul className="home-trust-list">
          {content.trust_items.map((item) => <li key={item}><Check size={16} />{item}</li>)}
        </ul>
      </div>
      <div className="home-hero-visual">
        <div className="home-hero-visual-decoration" aria-hidden="true" />
        <div className="home-hero-media">
          <FixedMediaFrame mediaKey="hero" className="home-hero-image-frame" src={imagePath} fallback="/images/brand/ladystars-hero.svg" alt={imageAlt ?? ''} positionX={content.image_position_x} positionY={content.image_position_y} loading="eager" fetchPriority="high" />
          <div className="home-hero-note"><span>{content.note_label}</span><strong>{content.note_value}</strong></div>
        </div>
      </div>
    </div>
  </section>
}

export function QuickConsultation({ content }: { content: HomePageSections['consultation'] }) {
  return <section className="container-page home-consultation-wrap" aria-labelledby="quick-consultation-title">
    <div className="home-consultation">
      <div><p className="home-kicker">{content.kicker}</p><h2 id="quick-consultation-title">{content.title}</h2><p>{content.description}</p></div>
      <div className="home-consultation-options" aria-label="Nhu cầu tư vấn">
        {content.options.map((option) => <span key={option}>{option}</span>)}
      </div>
      <Link to={content.cta_url} className="btn-primary">{content.cta_label} <ArrowRight size={18} /></Link>
    </div>
  </section>
}
