import { useQuery } from '@tanstack/react-query'
import { BadgeCheck, CalendarDays, Check, Clock3, Headphones, HeartHandshake, Loader2, Mail, MapPin, MessagesSquare, Navigation, Phone, Quote, ShieldCheck, Sparkles } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { getContactPage, submitConsultation } from '../../api/contentApi'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingState } from '../../components/common/LoadingState'
import type { ContactCommitment } from '../../types'
import './ContactPage.css'

const commitmentIcons: Record<string, ReactNode> = {
  sparkles: <Sparkles />,
  'heart-handshake': <HeartHandshake />,
  'shield-check': <ShieldCheck />,
  'badge-check': <BadgeCheck />,
  headphones: <Headphones />,
  'map-pin': <MapPin />,
  'messages-square': <MessagesSquare />,
}

function SmartLink({ href, className, children }: { href?: string | null; className: string; children: ReactNode }) {
  if (!href) return null
  if (href.startsWith('/')) return <Link className={className} to={href}>{children}</Link>
  return <a className={className} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined}>{children}</a>
}

function CommitmentIcon({ item }: { item: ContactCommitment }) {
  return <>{commitmentIcons[item.icon ?? ''] ?? <Sparkles />}</>
}

export function ContactPage() {
  const query = useQuery({ queryKey: ['contact-page'], queryFn: getContactPage })
  const [submitting, setSubmitting] = useState(false)
  const data = query.data
  const content = data?.content
  const settings = content?.settings ?? {}

  useEffect(() => {
    if (!data?.seo?.title) return
    document.title = data.seo.title
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (description && data.seo.description) description.content = data.seo.description
  }, [data?.seo])

  if (query.isLoading) return <LoadingState />
  if (!content) return <div className="container-page contact-page-empty"><EmptyState title="Trang liên hệ chưa có nội dung" description="Vui lòng bổ sung nội dung trong khu vực quản trị." /></div>

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    setSubmitting(true)
    try {
      await submitConsultation({
        name: String(values.get('name') ?? ''),
        phone: String(values.get('phone') ?? ''),
        service_name: String(values.get('service_name') ?? '') || undefined,
        branch_id: Number(values.get('branch_id')) || undefined,
        source_page: '/lien-he',
        message: String(values.get('message') ?? '') || undefined,
      })
      form.reset()
      toast.success(settings.form_success_message ?? '')
    } catch {
      toast.error('Không thể gửi yêu cầu lúc này. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  const phoneHref = data.store?.support_phone?.replace(/[^\d+]/g, '')

  return <main className="contact-page">
    <section className="container-page contact-page-hero">
      <div className="contact-page-hero-copy">
        {content.hero_eyebrow && <span className="contact-page-eyebrow">{content.hero_eyebrow}</span>}
        {content.hero_title && <h1>{content.hero_title}</h1>}
        {content.hero_description && <p>{content.hero_description}</p>}
        <div className="contact-page-hero-actions">
          <SmartLink href={settings.hero_primary_url} className="btn-light">{settings.hero_primary_label}<CalendarDays size={18} /></SmartLink>
          <SmartLink href={settings.hero_secondary_url} className="contact-page-text-link">{settings.hero_secondary_label}<Navigation size={17} /></SmartLink>
        </div>
      </div>
      <div className="contact-page-hero-visual">
        {content.hero_image_path && <img src={content.hero_image_path} alt={content.hero_image_alt ?? ''} />}
        <div className="contact-page-hero-note"><span><MessagesSquare size={17} /></span><strong>{data.store?.store_name}</strong><small>{settings.hours_value}</small></div>
      </div>
    </section>

    <section className="container-page contact-page-intro">
      <header className="contact-page-section-heading contact-page-section-heading-left">
        {content.contact_eyebrow && <span className="contact-page-eyebrow">{content.contact_eyebrow}</span>}
        {content.contact_title && <h2>{content.contact_title}</h2>}
        {content.contact_description && <p>{content.contact_description}</p>}
      </header>
      <div className="contact-page-info-grid">
        {data.store?.support_phone && <a href={`tel:${phoneHref}`} className="contact-page-info-card"><span><Phone /></span><small>{settings.hotline_label}</small><strong>{data.store.support_phone}</strong></a>}
        {data.store?.support_email && <a href={`mailto:${data.store.support_email}`} className="contact-page-info-card"><span><Mail /></span><small>{settings.email_label}</small><strong>{data.store.support_email}</strong></a>}
        {settings.hours_value && <div className="contact-page-info-card"><span><Clock3 /></span><small>{settings.hours_label}</small><strong>{settings.hours_value}</strong></div>}
      </div>
    </section>

    {settings.commitments?.length ? <section className="contact-page-commitments">
      <div className="container-page">
        <header className="contact-page-section-heading">
          {content.commitments_eyebrow && <span className="contact-page-eyebrow">{content.commitments_eyebrow}</span>}
          {content.commitments_title && <h2>{content.commitments_title}</h2>}
          {content.commitments_description && <p>{content.commitments_description}</p>}
        </header>
        <div className="contact-page-commitment-grid">{settings.commitments.map((item, index) => <article key={`${item.title}-${index}`}><span><CommitmentIcon item={item} /></span><h3>{item.title}</h3>{item.description && <p>{item.description}</p>}</article>)}</div>
      </div>
    </section> : null}

    <section className="container-page contact-page-guide">
      <div className="contact-page-guide-visual">{content.guide_image_path && <img src={content.guide_image_path} alt={content.guide_image_alt ?? ''} />}</div>
      <div className="contact-page-guide-copy">
        {content.guide_eyebrow && <span className="contact-page-eyebrow">{content.guide_eyebrow}</span>}
        {content.guide_title && <h2>{content.guide_title}</h2>}
        {content.guide_description && <p>{content.guide_description}</p>}
        {settings.guide_points?.length ? <ul>{settings.guide_points.map((point) => <li key={point}><span><Check size={15} /></span>{point}</li>)}</ul> : null}
        {content.guide_quote && <blockquote><Quote size={24} /><p>{content.guide_quote}</p></blockquote>}
      </div>
    </section>

    {data.branches.length ? <section className="contact-page-branches">
      <div className="container-page">
        <header className="contact-page-section-heading">
          {content.branches_eyebrow && <span className="contact-page-eyebrow">{content.branches_eyebrow}</span>}
          {content.branches_title && <h2>{content.branches_title}</h2>}
          {content.branches_description && <p>{content.branches_description}</p>}
        </header>
        <div className="contact-page-branch-grid">{data.branches.map((branch, index) => <article key={branch.id}>
          <span className="contact-page-branch-number">{String(index + 1).padStart(2, '0')}</span>
          <div><MapPin size={19} /><h3>{branch.name}</h3></div>
          {branch.full_address && <p>{branch.full_address}</p>}
          {branch.opening_hours && <small><Clock3 size={14} />{branch.opening_hours}</small>}
          <div className="contact-page-branch-actions">
            {branch.phone && <a href={`tel:${branch.phone.replace(/[^\d+]/g, '')}`}><Phone size={15} />{settings.branch_call_label}</a>}
            {branch.map_url && <a href={branch.map_url} target="_blank" rel="noreferrer"><Navigation size={15} />{settings.branch_directions_label}</a>}
          </div>
        </article>)}</div>
      </div>
    </section> : null}

    <section id="form-lien-he" className="container-page contact-page-form-section">
      <div className="contact-page-form-copy">
        {content.form_eyebrow && <span className="contact-page-eyebrow">{content.form_eyebrow}</span>}
        {content.form_title && <h2>{content.form_title}</h2>}
        {content.form_description && <p>{content.form_description}</p>}
        {settings.privacy_note && <div className="contact-page-form-assurance"><ShieldCheck /><span>{settings.privacy_note}</span></div>}
      </div>
      <form className="contact-page-form" onSubmit={submit}>
        <label><span>{settings.form_name_label}</span><input name="name" required autoComplete="name" /></label>
        <label><span>{settings.form_phone_label}</span><input name="phone" required inputMode="tel" autoComplete="tel" /></label>
        <label><span>{settings.form_service_label}</span><select name="service_name" defaultValue=""><option value="">—</option>{settings.services?.map((service) => <option key={service} value={service}>{service}</option>)}</select></label>
        <label><span>{settings.form_branch_label}</span><select name="branch_id" defaultValue=""><option value="">—</option>{data.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
        <label className="contact-page-form-message"><span>{settings.form_message_label}</span><textarea name="message" rows={5} /></label>
        <button type="submit" disabled={submitting}>{submitting ? <Loader2 className="animate-spin" /> : <CalendarDays />}<span>{settings.form_submit_label}</span></button>
      </form>
    </section>
  </main>
}
