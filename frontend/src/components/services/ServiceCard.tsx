import { CalendarDays, Phone } from 'lucide-react'
import type { Service } from '../../types'

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
const phoneHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`

export function ServiceCard({ service, hotline, onBook }: { service: Service; hotline?: string | null; onBook: (service: Service) => void }) {
  return <article className="service-card">
    <div className="service-card-image">{service.image_path ? <img src={service.image_path} alt={service.image_alt || service.name} /> : <span aria-label={service.image_alt || service.name}>LS</span>}</div>
    <div className="service-card-body">
      <h3>{service.name}</h3>
      {service.short_description && <p>{service.short_description}</p>}
      <div className="service-card-price"><span>Giá dịch vụ</span><strong>{currency.format(service.price)}</strong></div>
      <div className="service-card-actions">
        <button type="button" className="service-book-button" onClick={() => onBook(service)} aria-label={`Đặt lịch giữ chỗ cho ${service.name}`}><CalendarDays size={18} />Đặt lịch giữ chỗ</button>
        {hotline && <a className="service-hotline-button" href={phoneHref(hotline)} aria-label={`Gọi hotline đặt ${service.name}`}><Phone size={17} />Gọi hotline</a>}
      </div>
    </div>
  </article>
}
