import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, LoaderCircle, Phone, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { getStorePage, submitConsultation } from '../../api/contentApi'
import type { Service } from '../../types'
import './ConsultationDialog.css'

const heroImage = '/images/brand/ladystars-hero.svg'
const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled])'

function phoneHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

export function ConsultationDialog({ open, onClose, productId, service, context, hotline: hotlineOverride }: { open: boolean; onClose: () => void; productId?: number; service?: Service | null; context?: string; hotline?: string | null }) {
  const location = useLocation()
  const storePage = useQuery({ queryKey: ['store-page'], queryFn: getStorePage, enabled: open && !hotlineOverride })
  const dialogRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const hotline = hotlineOverride ?? storePage.data?.branches.find((branch) => branch.is_default)?.phone ?? storePage.data?.branches[0]?.phone

  const closeDialog = () => {
    setSubmitted(false)
    setError('')
    onClose()
  }

  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.classList.add('consultation-dialog-open')
    const focusTimer = window.setTimeout(() => nameInputRef.current?.focus(), 0)
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') closeDialog()
    }
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.clearTimeout(focusTimer)
      window.removeEventListener('keydown', handleEscape)
      document.body.classList.remove('consultation-dialog-open')
      previousFocus?.focus()
    }
  }, [open])

  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    setSubmitting(true)
    setError('')
    try {
      await submitConsultation({
        name: String(form.get('name') ?? '').trim(),
        phone: String(form.get('phone') ?? '').trim(),
        source_page: location.pathname,
        product_id: productId,
        service_id: service?.id,
        message: String(form.get('message') ?? '').trim() || context || undefined,
      })
      formElement.reset()
      setSubmitted(true)
    } catch {
      setError('Chưa thể gửi yêu cầu. Vui lòng kiểm tra thông tin và thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return <div className='consultation-dialog-backdrop' role='presentation' onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog() }}>
    <div ref={dialogRef} className={`consultation-dialog ${submitted ? 'is-success' : ''}`} role='dialog' aria-modal='true' aria-labelledby='consultation-dialog-title' onKeyDown={trapFocus}>
      <button className='consultation-dialog-close' type='button' onClick={closeDialog} aria-label='Đóng cửa sổ đặt lịch'><X size={20} /></button>
      {submitted ? <div className='consultation-dialog-success' role='status'>
        <span><CheckCircle2 size={38} /></span>
        <h2 id='consultation-dialog-title'>Xác nhận đăng ký thành công!</h2>
        <p>Cảm ơn bạn đã để lại thông tin. LADYSTARS sẽ liên hệ lại trong thời gian sớm nhất.</p>
        <button className='btn-primary' type='button' onClick={closeDialog}>Hoàn tất</button>
      </div> : <>
        <div className='consultation-dialog-media'>
          <img src={service?.image_path || heroImage} alt={service?.image_alt || service?.name || 'Minh họa phong cách tóc LADYSTARS'} />
        </div>
        <div className='consultation-dialog-content'>
          <p className='consultation-dialog-eyebrow'>LADYSTARS CARE</p>
          <h2 id='consultation-dialog-title'>{service ? 'Đặt lịch dịch vụ' : 'Tư vấn miễn phí giải pháp tóc phù hợp với bạn'}</h2>
          <p>{service ? <><strong>{service.name}</strong><br />Để lại thông tin, LADYSTARS sẽ liên hệ xác nhận lịch phù hợp.</> : 'Để lại thông tin, đội ngũ LADYSTARS sẽ chủ động liên hệ và hỗ trợ bạn.'}</p>
          <form onSubmit={submit}>
            <label><span>Họ và tên</span><input ref={nameInputRef} name='name' required maxLength={120} autoComplete='name' placeholder='Nhập họ và tên' /></label>
            <label><span>Số điện thoại</span><input name='phone' required minLength={8} maxLength={30} inputMode='tel' autoComplete='tel' placeholder='Nhập số điện thoại' /></label>
            <label><span>Nhu cầu / ghi chú</span><textarea name='message' maxLength={2000} placeholder='Thông tin bạn muốn LADYSTARS lưu ý' /></label>
            {error && <p className='consultation-dialog-error' role='alert'>{error}</p>}
            <button className='consultation-dialog-submit' type='submit' disabled={submitting}>{submitting ? <><LoaderCircle className='is-spinning' size={18} />Đang gửi...</> : 'Đặt lịch'}</button>
          </form>
          {hotline && <a className='consultation-dialog-phone' href={phoneHref(hotline)} aria-label={`Gọi hotline ${hotline}`}><Phone size={18} /><span>Hotline: <strong>{hotline}</strong></span></a>}
        </div>
      </>}
    </div>
  </div>
}
