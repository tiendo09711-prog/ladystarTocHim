import { useMemo, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { LoadingState } from '../../components/common/LoadingState'
import { useAuth } from '../../stores/AuthContext'
import type { ApiResponse, Appointment, AppointmentOptions, AppointmentSlot } from '../../types'
import { statusLabel } from '../../utils/format'

export function AppointmentPage() {
  const { user } = useAuth()
  const today = new Intl.DateTimeFormat('en-CA').format(new Date())
  const options = useQuery({ queryKey: ['appointment-options'], queryFn: async () => (await apiClient.get<ApiResponse<AppointmentOptions>>('/appointment-options')).data.data })
  const [branchId, setBranchId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState('')
  const [booked, setBooked] = useState<Appointment | null>(null)
  const [guestToken, setGuestToken] = useState<string | null>(null)
  const [rescheduleAt, setRescheduleAt] = useState('')
  const enabled = Boolean(branchId && serviceId && date)
  const availability = useQuery({ queryKey: ['appointment-slots', branchId, serviceId, date], enabled, queryFn: async () => (await apiClient.get<ApiResponse<{ slots: AppointmentSlot[] }>>('/appointment-availability', { params: { branch_id: branchId, service_id: serviceId, date } })).data.data })
  const chosenService = useMemo(() => options.data?.services.find((item) => item.id === Number(serviceId)), [options.data, serviceId])
  if (options.isLoading) return <LoadingState />

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const payload = { branch_id: Number(branchId), service_id: Number(serviceId), start_at: slot, customer_name: form.get('customer_name'), customer_phone: form.get('customer_phone'), customer_email: form.get('customer_email') || null, customer_note: form.get('customer_note') || null }
    try {
      if (user) {
        const response = await apiClient.post<ApiResponse<Appointment>>('/account/appointments', payload)
        setBooked(response.data.data)
      } else {
        const response = await apiClient.post<ApiResponse<{ appointment: Appointment; guest_token: string }>>('/appointments', payload)
        setBooked(response.data.data.appointment)
        setGuestToken(response.data.data.guest_token)
      }
      toast.success('Đặt lịch thành công.')
    } catch { toast.error('Khung giờ đã hết chỗ hoặc dữ liệu chưa hợp lệ.') }
  }

  const guestAction = async (action: 'cancel' | 'reschedule') => {
    if (!booked || !guestToken) return
    try {
      const config = { headers: { 'X-Guest-Token': guestToken } }
      const response = action === 'cancel'
        ? await apiClient.post<ApiResponse<Appointment>>(`/guest/appointments/${booked.id}/cancel`, {}, config)
        : await apiClient.patch<ApiResponse<Appointment>>(`/guest/appointments/${booked.id}/reschedule`, { start_at: new Date(rescheduleAt).toISOString() }, config)
      setBooked(response.data.data)
      if (action === 'reschedule') setRescheduleAt('')
      toast.success(action === 'cancel' ? 'Đã hủy lịch hẹn.' : 'Đã đổi lịch hẹn.')
    } catch { toast.error('Không thể cập nhật lịch hẹn theo chính sách hiện tại.') }
  }

  return <div className='container-page py-10'><div className='mx-auto max-w-4xl'><div className='mb-7'><p className='text-sm font-bold uppercase tracking-widest text-emerald-700'>LADYSTARS Care</p><h1 className='mt-2 text-4xl font-black'>Đặt lịch dịch vụ</h1><p className='muted mt-2'>Chọn chi nhánh, dịch vụ, ngày và khung giờ còn khả dụng.</p></div>
    {booked ? <div className='card p-7'><h2 className='text-2xl font-black'>Đã ghi nhận lịch hẹn</h2><p className='mt-3'>Mã lịch: <strong>{booked.code}</strong></p><p>Thời gian: {new Date(booked.start_at).toLocaleString('vi-VN')}</p><p>Chi nhánh: {booked.branch.name}</p><p>Trạng thái: {statusLabel[booked.status] ?? booked.status}</p>{guestToken && ['pending', 'confirmed'].includes(booked.status) && <div className='mt-5 flex flex-wrap items-end gap-3'><label><span className='label'>Thời gian mới</span><input className='input' type='datetime-local' value={rescheduleAt} onChange={(event) => setRescheduleAt(event.target.value)} /></label><button className='btn-primary' disabled={!rescheduleAt} onClick={() => void guestAction('reschedule')}>Đổi lịch</button><button className='btn-secondary text-red-700' onClick={() => void guestAction('cancel')}>Hủy lịch</button></div>}<p className='muted mt-4'>Quyền quản lý lịch khách chỉ được giữ trong bộ nhớ trang hiện tại, không lưu vào localStorage.</p></div> : <form className='card grid gap-5 p-6 md:grid-cols-2' onSubmit={submit}>
      <label><span className='label'>1. Chi nhánh</span><select className='input' value={branchId} onChange={(event) => { setBranchId(event.target.value); setSlot('') }} required><option value=''>Chọn chi nhánh</option>{options.data?.branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label><span className='label'>2. Dịch vụ</span><select className='input' value={serviceId} onChange={(event) => { setServiceId(event.target.value); setSlot('') }} required><option value=''>Chọn dịch vụ</option>{options.data?.services.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.duration_minutes} phút)</option>)}</select></label>
      <label><span className='label'>3. Ngày</span><input className='input' type='date' min={today} value={date} onChange={(event) => { setDate(event.target.value); setSlot('') }} required /></label>
      <label><span className='label'>4. Khung giờ</span><select className='input' value={slot} onChange={(event) => setSlot(event.target.value)} disabled={!enabled || availability.isFetching} required><option value=''>{availability.isFetching ? 'Đang tải...' : 'Chọn khung giờ'}</option>{availability.data?.slots.map((item) => <option key={item.start_at} value={item.start_at}>{new Date(item.local_start).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</option>)}</select></label>
      <label><span className='label'>5. Họ tên</span><input className='input' name='customer_name' defaultValue={user?.name ?? ''} required /></label><label><span className='label'>Số điện thoại</span><input className='input' name='customer_phone' defaultValue={user?.phone ?? ''} required /></label>
      <label><span className='label'>Email</span><input className='input' type='email' name='customer_email' defaultValue={user?.email ?? ''} /></label><label><span className='label'>Thời lượng</span><input className='input bg-slate-100' value={chosenService ? `${chosenService.duration_minutes} phút` : ''} disabled /></label>
      <label className='md:col-span-2'><span className='label'>Ghi chú</span><textarea className='input min-h-24' name='customer_note' /></label><button className='btn-primary md:col-span-2' disabled={!slot}>Xác nhận đặt lịch</button>
    </form>}
  </div></div>
}
