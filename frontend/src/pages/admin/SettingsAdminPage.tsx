import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Save, Trash2, Upload } from 'lucide-react'
import { type FormEvent } from 'react'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { LoadingState } from '../../components/common/LoadingState'
import type { ApiResponse, StoreSettings } from '../../types'
import { resolveAssetUrl } from '../../utils/assetUrl'

export function SettingsAdminPage() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['admin-settings'], queryFn: async () => (await apiClient.get<ApiResponse<StoreSettings>>('/admin/settings')).data.data })
  if (query.isLoading || !query.data) return <LoadingState />
  const settings = query.data

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const nullable = (name: string) => String(form.get(name) ?? '') || null
    const enabled = (name: string) => form.get(name) === 'on'
    const payload = {
      store_name: String(form.get('store_name') ?? ''), support_phone: nullable('support_phone'), support_email: nullable('support_email'), store_address: nullable('store_address'), currency: 'VND',
      shipping_fee: Number(form.get('shipping_fee')), free_shipping_from: Number(form.get('free_shipping_from')), low_stock_threshold: Number(form.get('low_stock_threshold')), order_prefix: String(form.get('order_prefix') ?? '').toUpperCase(),
      bank_transfer_enabled: enabled('bank_transfer_enabled'), bank_name: nullable('bank_name'), bank_account_name: nullable('bank_account_name'), bank_account_number: nullable('bank_account_number'), bank_branch: nullable('bank_branch'), bank_transfer_note: nullable('bank_transfer_note'),
      returns_enabled: enabled('returns_enabled'), return_window_days: Number(form.get('return_window_days')), exchange_enabled: enabled('exchange_enabled'), exchange_window_days: Number(form.get('exchange_window_days')),
      refund_shipping_on_full_return: enabled('refund_shipping_on_full_return'), warranty_enabled: enabled('warranty_enabled'), appointments_enabled: enabled('appointments_enabled'), appointment_cancel_before_hours: Number(form.get('appointment_cancel_before_hours')), store_timezone: String(form.get('store_timezone') ?? ''),
    }
    try { await apiClient.put('/admin/settings', payload); await client.invalidateQueries({ queryKey: ['admin-settings'] }); toast.success('Đã lưu cấu hình cửa hàng.') } catch { toast.error('Không thể lưu cấu hình. Vui lòng kiểm tra dữ liệu.') }
  }

  const uploadQr = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); try { await apiClient.post('/admin/settings/bank-qr', form); await client.invalidateQueries({ queryKey: ['admin-settings'] }); toast.success('Đã cập nhật ảnh QR.') } catch { toast.error('Ảnh QR phải là JPG, PNG hoặc WEBP tối đa 4 MB.') } }
  const deleteQr = async () => { try { await apiClient.delete('/admin/settings/bank-qr'); await client.invalidateQueries({ queryKey: ['admin-settings'] }); toast.success('Đã xóa ảnh QR.') } catch { toast.error('Không thể xóa ảnh QR.') } }

  return <div>
    <div className='mb-6'><h1 className='text-3xl font-black'>Cài đặt cửa hàng</h1><p className='muted'>Cấu hình checkout, hậu mãi, bảo hành và lịch hẹn.</p></div>
    <form className='grid gap-6' onSubmit={save}>
      <section className='card grid gap-5 p-6 md:grid-cols-2'><h2 className='text-xl font-black md:col-span-2'>Thông tin chung</h2><Field name='store_name' label='Tên cửa hàng' value={settings.store_name} required /><Field name='order_prefix' label='Tiền tố mã đơn' value={settings.order_prefix} required /><Field name='support_phone' label='Điện thoại hỗ trợ' value={settings.support_phone} /><Field name='support_email' label='Email hỗ trợ' value={settings.support_email} type='email' /><Field name='store_address' label='Địa chỉ cửa hàng' value={settings.store_address} wide /><Field name='shipping_fee' label='Phí giao hàng (VND)' value={settings.shipping_fee} type='number' required /><Field name='free_shipping_from' label='Miễn phí từ (VND)' value={settings.free_shipping_from} type='number' required /><Field name='low_stock_threshold' label='Ngưỡng cảnh báo tồn kho' value={settings.low_stock_threshold} type='number' required /></section>
      <section className='card grid gap-5 p-6 md:grid-cols-2'><div className='md:col-span-2'><h2 className='text-xl font-black'>Thanh toán chuyển khoản</h2><Toggle name='bank_transfer_enabled' label='Bật chuyển khoản ngân hàng' checked={settings.bank_transfer_enabled} /></div><Field name='bank_name' label='Tên ngân hàng' value={settings.bank_name} /><Field name='bank_account_name' label='Chủ tài khoản' value={settings.bank_account_name} /><Field name='bank_account_number' label='Số tài khoản' value={settings.bank_account_number} /><Field name='bank_branch' label='Chi nhánh' value={settings.bank_branch} /><Field name='bank_transfer_note' label='Hướng dẫn chuyển khoản' value={settings.bank_transfer_note} wide /></section>
      <section className='card grid gap-5 p-6 md:grid-cols-2'><div className='md:col-span-2'><h2 className='text-xl font-black'>Hậu mãi và lịch hẹn</h2><p className='muted mt-1 text-sm'>Các thời hạn được backend kiểm tra; frontend chỉ hỗ trợ nhập cấu hình.</p></div><Toggle name='returns_enabled' label='Bật yêu cầu trả hàng' checked={settings.returns_enabled} /><Field name='return_window_days' label='Thời hạn trả hàng (ngày)' value={settings.return_window_days} type='number' required /><Toggle name='exchange_enabled' label='Bật yêu cầu đổi hàng' checked={settings.exchange_enabled} /><Field name='exchange_window_days' label='Thời hạn đổi hàng (ngày)' value={settings.exchange_window_days} type='number' required /><Toggle name='refund_shipping_on_full_return' label='Hoàn phí giao hàng khi trả toàn bộ' checked={settings.refund_shipping_on_full_return} /><Toggle name='warranty_enabled' label='Bật bảo hành' checked={settings.warranty_enabled} /><Toggle name='appointments_enabled' label='Bật đặt lịch' checked={settings.appointments_enabled} /><Field name='appointment_cancel_before_hours' label='Hủy trước tối thiểu (giờ)' value={settings.appointment_cancel_before_hours} type='number' required /><Field name='store_timezone' label='Múi giờ cửa hàng' value={settings.store_timezone} required wide /></section>
      <button className='btn-primary justify-self-start'><Save size={18} />Lưu cấu hình</button>
    </form>
    <section className='card mt-6 p-6'><h2 className='text-xl font-black'>Ảnh QR chuyển khoản</h2>{settings.bank_qr_path ? <div className='mt-4 flex flex-wrap items-end gap-4'><img className='max-h-64 rounded-xl border object-contain p-2' src={resolveAssetUrl(settings.bank_qr_path)} alt='QR chuyển khoản hiện tại' /><button className='btn-secondary text-red-700' type='button' onClick={() => void deleteQr()}><Trash2 size={17} />Xóa QR</button></div> : <p className='muted mt-3'>Chưa có ảnh QR.</p>}<form className='mt-4 flex flex-wrap items-end gap-3' onSubmit={uploadQr}><label><span className='label'>Chọn ảnh JPG, PNG hoặc WEBP</span><input className='input' type='file' name='image' accept='image/jpeg,image/png,image/webp' required /></label><button className='btn-secondary'><Upload size={17} />Upload QR</button></form></section>
  </div>
}

function Field({ name, label, value, type = 'text', required = false, wide = false }: { name: string; label: string; value?: string | number | null; type?: string; required?: boolean; wide?: boolean }) {
  return <label className={wide ? 'md:col-span-2' : ''}><span className='label'>{label}</span><input className='input' name={name} type={type} min={type === 'number' ? 0 : undefined} defaultValue={value ?? ''} required={required} /></label>
}

function Toggle({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return <label className='flex items-center gap-2 font-bold'><input type='checkbox' name={name} defaultChecked={checked} /> {label}</label>
}
