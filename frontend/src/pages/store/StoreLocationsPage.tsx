import { useQuery } from '@tanstack/react-query'
import { BadgeCheck, CalendarDays, ChevronRight, Clock3, ExternalLink, Headphones, HeartHandshake, Loader2, MapPin, MessagesSquare, Navigation, PackageCheck, Phone, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { getStorePage, submitConsultation } from '../../api/contentApi'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingState } from '../../components/common/LoadingState'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import type { StoreLocation, StorePageItem } from '../../types'
import './StoreLocationsPage.css'

const iconMap = {
  'calendar-days': CalendarDays,
  'messages-square': MessagesSquare,
  sparkles: Sparkles,
  'badge-check': BadgeCheck,
  'heart-handshake': HeartHandshake,
  'refresh-cw': RefreshCw,
  headphones: Headphones,
  'shield-check': ShieldCheck,
  'package-check': PackageCheck,
  'map-pin': MapPin,
} as const

function ItemIcon({ item }: { item: StorePageItem }) {
  const Icon = iconMap[item.icon as keyof typeof iconMap] ?? Sparkles
  return <Icon aria-hidden="true" />
}

function mapEmbedUrl(branch: StoreLocation) {
  if (branch.latitude === null || branch.latitude === undefined || branch.latitude === '' || branch.longitude === null || branch.longitude === undefined || branch.longitude === '') return null
  const latitude = Number(branch.latitude)
  const longitude = Number(branch.longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  const horizontal = 0.012
  const vertical = 0.007
  const bounds = [longitude - horizontal, latitude - vertical, longitude + horizontal, latitude + vertical].join(',')
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bounds)}&layer=mapnik&marker=${latitude}%2C${longitude}`
}

function StoreMap({ branch }: { branch?: StoreLocation }) {
  const embedUrl = branch ? mapEmbedUrl(branch) : null
  if (embedUrl) return <iframe className="store-locations-map-frame" title={`Bản đồ ${branch?.name ?? ''}`} src={embedUrl} loading="lazy" />

  return <div className="store-locations-map-empty">
    <span><MapPin aria-hidden="true" /></span>
    <strong>{branch?.name}</strong>
    <p>{branch?.full_address}</p>
  </div>
}

export function StoreLocationsPage() {
  const query = useQuery({ queryKey: ['store-page'], queryFn: getStorePage })
  const data = query.data
  const content = data?.content
  const settings = content?.settings ?? {}
  const [region, setRegion] = useState('all')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  useDocumentMeta(data?.seo?.title, data?.seo?.description)

  const regions = useMemo(() => Array.from(new Set((data?.branches ?? []).map((branch) => branch.province).filter((value): value is string => Boolean(value)))), [data?.branches])
  const filteredBranches = useMemo(() => (data?.branches ?? []).filter((branch) => region === 'all' || branch.province === region), [data?.branches, region])
  const selectedBranch = filteredBranches.find((branch) => branch.id === selectedId) ?? filteredBranches[0]

  useEffect(() => {
    if (selectedBranch && selectedBranch.id !== selectedId) setSelectedId(selectedBranch.id)
    if (!selectedBranch && selectedId !== null) setSelectedId(null)
  }, [selectedBranch, selectedId])

  if (query.isLoading) return <div className="container-page py-12"><LoadingState /></div>
  if (query.isError) return <div className="container-page py-12"><EmptyState title="Không thể tải trang cửa hàng" description="Vui lòng thử lại sau ít phút." /></div>
  if (!content) return <div className="container-page py-12"><EmptyState title="Trang đang được cập nhật" description="Nội dung sẽ hiển thị sau khi được cấu hình trong khu vực quản trị." /></div>

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const service = String(form.get('service') ?? '')
    const branchId = Number(form.get('branch_id') ?? 0)
    const branch = data?.branches.find((item) => item.id === branchId)
    const note = String(form.get('message') ?? '').trim()
    const message = [service && `Dịch vụ: ${service}`, branch && `Cửa hàng: ${branch.name}`, note && `Ghi chú: ${note}`].filter(Boolean).join('\n')
    setSubmitting(true)
    try {
      await submitConsultation({ name: String(form.get('name') ?? ''), phone: String(form.get('phone') ?? ''), source_page: 'he-thong-cua-hang', message })
      event.currentTarget.reset()
      toast.success(settings.form_success_message ?? 'Đã gửi yêu cầu tư vấn.')
    } catch {
      toast.error('Chưa thể gửi yêu cầu. Vui lòng kiểm tra thông tin và thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="store-locations-page">
    <section className="container-page store-locations-hero">
      <div className="store-locations-hero-copy">
        <nav className="store-locations-breadcrumb" aria-label="Breadcrumb"><Link to="/">Trang chủ</Link><ChevronRight size={14} /><span>Hệ thống cửa hàng</span></nav>
        {content.eyebrow && <span className="store-locations-eyebrow">{content.eyebrow}</span>}
        {content.title && <h1>{content.title}</h1>}
        {content.description && <p>{content.description}</p>}
        <a className="btn-primary" href="#danh-sach-cua-hang"><MapPin size={18} />{content.locations_title}</a>
      </div>
      <div className="store-locations-hero-visual" aria-hidden={!content.hero_image_alt}>
        {content.hero_image_path ? <img src={content.hero_image_path} alt={content.hero_image_alt ?? ''} /> : <MapPin />}
        <span className="store-locations-hero-orbit store-locations-hero-orbit-one" />
        <span className="store-locations-hero-orbit store-locations-hero-orbit-two" />
      </div>
    </section>

    <section id="danh-sach-cua-hang" className="container-page store-locations-directory">
      <header className="store-locations-section-heading">
        {content.locations_eyebrow && <span className="store-locations-eyebrow">{content.locations_eyebrow}</span>}
        {content.locations_title && <h2>{content.locations_title}</h2>}
        {content.locations_description && <p>{content.locations_description}</p>}
      </header>
      <div className="store-locations-regions" role="tablist" aria-label="Lọc cửa hàng theo khu vực">
        <button className={region === 'all' ? 'is-active' : ''} role="tab" aria-selected={region === 'all'} onClick={() => setRegion('all')}>{settings.region_all_label}</button>
        {regions.map((item) => <button key={item} className={region === item ? 'is-active' : ''} role="tab" aria-selected={region === item} onClick={() => setRegion(item)}>{item}</button>)}
      </div>
      {filteredBranches.length ? <div className="store-locations-explorer">
        <div className="store-locations-list">
          {filteredBranches.map((branch) => <article key={branch.id} className={`store-location-card ${selectedBranch?.id === branch.id ? 'is-selected' : ''}`}>
            <button type="button" className="store-location-card-select" onClick={() => setSelectedId(branch.id)} aria-label={`${settings.details_label ?? ''} ${branch.name}`}>
              <span className="store-location-card-image">{branch.image_path ? <img src={branch.image_path} alt={branch.image_alt ?? branch.name} /> : <MapPin />}</span>
              <span className="store-location-card-copy">
                <small>{branch.province}</small>
                <strong>{branch.name}</strong>
                {branch.full_address && <span><MapPin size={15} />{branch.full_address}</span>}
                {branch.opening_hours && <span><Clock3 size={15} />{branch.opening_hours}</span>}
              </span>
            </button>
            <div className="store-location-card-actions">
              {branch.phone && <a href={`tel:${branch.phone.replace(/\s/g, '')}`}><Phone size={15} />{settings.call_label}</a>}
              {branch.map_url && <a href={branch.map_url} target="_blank" rel="noreferrer"><Navigation size={15} />{settings.directions_label}</a>}
              {branch.booking_url && <a href={branch.booking_url}><CalendarDays size={15} />{settings.booking_label}</a>}
            </div>
          </article>)}
        </div>
        <div className="store-locations-map-shell">
          <StoreMap branch={selectedBranch} />
          {selectedBranch && <div className="store-locations-map-card">
            <span>{selectedBranch.province}</span>
            <strong>{selectedBranch.name}</strong>
            {selectedBranch.public_description && <p>{selectedBranch.public_description}</p>}
            <div>{selectedBranch.phone && <a href={`tel:${selectedBranch.phone.replace(/\s/g, '')}`}><Phone size={16} />{selectedBranch.phone}</a>}{selectedBranch.map_url && <a href={selectedBranch.map_url} target="_blank" rel="noreferrer"><ExternalLink size={16} />{settings.directions_label}</a>}</div>
          </div>}
        </div>
      </div> : <EmptyState title={content.empty_title ?? ''} description={content.empty_description ?? ''} />}
    </section>

    {(content.support_title || content.support_description) && <section className="container-page store-locations-support">
      <div><span><Headphones /></span><div>{content.support_title && <h2>{content.support_title}</h2>}{content.support_description && <p>{content.support_description}</p>}</div></div>
      {settings.support_cta_url && settings.support_cta_label && <a className="btn-secondary" href={settings.support_cta_url}>{settings.support_cta_label}<ChevronRight size={17} /></a>}
    </section>}

    {data?.steps.length ? <section className="store-locations-process">
      <div className="container-page">
        <header className="store-locations-section-heading">
          {content.process_eyebrow && <span className="store-locations-eyebrow">{content.process_eyebrow}</span>}
          {content.process_title && <h2>{content.process_title}</h2>}
          {content.process_description && <p>{content.process_description}</p>}
        </header>
        <ol className="store-locations-process-list">
          {data.steps.map((item, index) => <li key={item.id}>
            <span className="store-locations-process-number">{String(index + 1).padStart(2, '0')}</span>
            <article>
              <div className="store-locations-process-media">{item.image_path ? <img src={item.image_path} alt={item.image_alt ?? item.title} /> : <ItemIcon item={item} />}</div>
              <div><span className="store-locations-process-icon"><ItemIcon item={item} /></span><h3>{item.title}</h3>{item.description && <p>{item.description}</p>}</div>
            </article>
          </li>)}
        </ol>
      </div>
    </section> : null}

    {data?.policies.length ? <section className="container-page store-locations-policies">
      <header className="store-locations-section-heading">
        {content.policies_eyebrow && <span className="store-locations-eyebrow">{content.policies_eyebrow}</span>}
        {content.policies_title && <h2>{content.policies_title}</h2>}
        {content.policies_description && <p>{content.policies_description}</p>}
      </header>
      <div className="store-locations-policy-grid">{data.policies.map((item) => <article key={item.id}><span><ItemIcon item={item} /></span><h3>{item.title}</h3>{item.description && <p>{item.description}</p>}</article>)}</div>
    </section> : null}

    <section id="dat-lich-tu-van" className="container-page store-locations-contact">
      <div className="store-locations-contact-image">{content.contact_image_path ? <img src={content.contact_image_path} alt={content.contact_image_alt ?? ''} /> : <HeartHandshake />}</div>
      <div className="store-locations-contact-copy">
        {content.contact_eyebrow && <span className="store-locations-eyebrow">{content.contact_eyebrow}</span>}
        {content.contact_title && <h2>{content.contact_title}</h2>}
        {content.contact_description && <p>{content.contact_description}</p>}
        <form onSubmit={submit} className="store-locations-form">
          <label><span className="label">{settings.form_name_label}</span><input className="input" name="name" required autoComplete="name" /></label>
          <label><span className="label">{settings.form_phone_label}</span><input className="input" name="phone" required inputMode="tel" autoComplete="tel" /></label>
          <label><span className="label">{settings.form_service_label}</span><select className="input" name="service" defaultValue=""><option value="" disabled>—</option>{settings.services?.map((service) => <option key={service}>{service}</option>)}</select></label>
          <label><span className="label">{settings.form_branch_label}</span><select className="input" name="branch_id" defaultValue={selectedBranch?.id ?? ''}><option value="">—</option>{data?.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
          <label className="store-locations-form-message"><span className="label">{settings.form_message_label}</span><textarea className="input" name="message" rows={4} /></label>
          <button className="btn-primary" disabled={submitting}>{submitting ? <Loader2 className="animate-spin" size={18} /> : <CalendarDays size={18} />}{settings.form_submit_label}</button>
        </form>
      </div>
    </section>
  </main>
}
