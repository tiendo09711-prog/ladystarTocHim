import type { Appointment, Product } from '../types'

export async function copyText(value: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value)
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

export async function shareProduct(product: Product) {
  const url = `${window.location.origin}/san-pham/${product.slug}`
  if (navigator.share) return navigator.share({ title: product.name, text: product.short_description || product.name, url })
  return copyText(url)
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

function icsDate(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

export function downloadAppointmentIcs(appointment: Appointment) {
  const location = appointment.branch.name
  const content = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LADYSTARS//Appointment//VI', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', `UID:ladystars-appointment-${appointment.id}@local`, `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(appointment.start_at)}`, `DTEND:${icsDate(appointment.end_at)}`,
    `SUMMARY:${escapeIcs(`LADYSTARS - ${appointment.service.name}`)}`,
    `LOCATION:${escapeIcs(location)}`, `DESCRIPTION:${escapeIcs(`Mã lịch hẹn: ${appointment.code}`)}`,
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n')
  const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${appointment.code}.ics`
  anchor.click()
  URL.revokeObjectURL(url)
}
