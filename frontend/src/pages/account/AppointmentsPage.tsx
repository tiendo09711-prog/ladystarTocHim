import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useState } from 'react'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingState } from '../../components/common/LoadingState'
import type { ApiResponse, Appointment, Pagination } from '../../types'
import { statusLabel } from '../../utils/format'

export function AppointmentsPage() {
  const { id } = useParams()
  const client = useQueryClient()
  const [rescheduleAt, setRescheduleAt] = useState('')
  const query = useQuery({
    queryKey: ['account-appointments', id],
    queryFn: async () => id
      ? (await apiClient.get<ApiResponse<Appointment>>(`/account/appointments/${id}`)).data.data
      : (await apiClient.get<ApiResponse<Pagination<Appointment>>>('/account/appointments')).data.data,
  })
  if (query.isLoading) return <LoadingState />

  const refresh = async () => client.invalidateQueries({ queryKey: ['account-appointments'] })
  const cancel = async (appointmentId: number) => { try { await apiClient.post(`/account/appointments/${appointmentId}/cancel`); await refresh(); toast.success('Đã hủy lịch hẹn.') } catch { toast.error('Không thể hủy lịch hẹn theo chính sách hiện tại.') } }
  const reschedule = async (appointmentId: number) => { if (!rescheduleAt) return; try { await apiClient.patch(`/account/appointments/${appointmentId}/reschedule`, { start_at: new Date(rescheduleAt).toISOString() }); await refresh(); setRescheduleAt(''); toast.success('Đã đổi lịch hẹn.') } catch { toast.error('Khung giờ mới không còn khả dụng.') } }

  if (id) {
    const item = query.data as Appointment
    const mutable = ['pending', 'confirmed'].includes(item.status)
    return <div className='card p-6'>
      <Link className='text-sm font-bold text-emerald-800' to='/tai-khoan/lich-hen'>← Tất cả lịch hẹn</Link>
      <div className='mt-4 flex flex-wrap justify-between gap-3'><div><h1 className='text-2xl font-black'>{item.code}</h1><p className='muted mt-1'>{item.service.name} · {item.branch.name}</p></div><span className='badge'>{statusLabel[item.status] ?? item.status}</span></div>
      <dl className='mt-6 grid gap-4 rounded-2xl bg-slate-50 p-5 sm:grid-cols-2'><Info label='Bắt đầu' value={new Date(item.start_at).toLocaleString('vi-VN')} /><Info label='Kết thúc' value={new Date(item.end_at).toLocaleString('vi-VN')} /><Info label='Chi nhánh' value={item.branch.name} /><Info label='Dịch vụ' value={`${item.service.name} (${item.service.duration_minutes} phút)`} /><Info label='Ghi chú' value={item.customer_note || 'Không có'} /></dl>
      {mutable && <div className='mt-5 flex flex-wrap items-end gap-3'><label><span className='label'>Thời gian mới</span><input className='input' type='datetime-local' value={rescheduleAt} onChange={(event) => setRescheduleAt(event.target.value)} /></label><button className='btn-primary' type='button' disabled={!rescheduleAt} onClick={() => void reschedule(item.id)}>Đổi lịch</button><button className='btn-secondary text-red-700' type='button' onClick={() => void cancel(item.id)}>Hủy lịch</button></div>}
    </div>
  }

  const page = query.data as Pagination<Appointment>
  return <div><div className='mb-5 flex flex-wrap items-center justify-between gap-3'><h1 className='text-2xl font-black'>Lịch hẹn</h1><Link className='btn-primary' to='/dat-lich'>Đặt lịch mới</Link></div>{page?.data.length ? <div className='grid gap-4'>{page.data.map((item) => <Link className='card block p-5' key={item.id} to={`/tai-khoan/lich-hen/${item.id}`}><div className='flex flex-wrap justify-between gap-3'><div><strong>{item.code}</strong><p className='muted mt-1'>{new Date(item.start_at).toLocaleString('vi-VN')} · {item.service.name}</p><p className='muted'>{item.branch.name}</p></div><span className='badge'>{statusLabel[item.status] ?? item.status}</span></div></Link>)}</div> : <EmptyState title='Chưa có lịch hẹn' description='Bạn có thể đặt lịch dịch vụ tại trang Đặt lịch.' />}</div>
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className='text-sm font-bold text-slate-500'>{label}</dt><dd className='mt-1'>{value}</dd></div>
}
