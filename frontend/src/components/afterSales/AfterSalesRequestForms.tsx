import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import type { Order } from '../../types'
import { usePublicSettings } from '../../stores/CurrencyContext'
import { useFormatPrice } from '../../utils/format'

export function AfterSalesRequestForms({ order }: { order: Order }) {
  const formatPrice = useFormatPrice()
  const settings = usePublicSettings().data
  const returnsEnabled = settings?.returns_enabled === true
  const exchangeEnabled = settings?.exchange_enabled === true
  const warrantyEnabled = settings?.warranty_enabled === true
  const [mode, setMode] = useState<'return' | 'warranty' | null>(null)
  const [requestType, setRequestType] = useState<'return' | 'exchange'>('return')
  const [selectedItemId, setSelectedItemId] = useState(order.items[0]?.id ?? 0)
  const [saving, setSaving] = useState(false)
  if (order.order_status !== 'completed' || (!returnsEnabled && !exchangeEnabled && !warrantyEnabled)) return null
  const selectedItem = order.items.find((item) => item.id === selectedItemId) ?? order.items[0]

  const submitReturn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    const form = new FormData(event.currentTarget)
    const data = new FormData()
    data.append('order_id', String(order.id)); data.append('request_type', requestType); data.append('customer_note', String(form.get('customer_note') ?? ''))
    data.append('items[0][order_item_id]', String(selectedItemId)); data.append('items[0][quantity]', String(form.get('quantity') ?? 1)); data.append('items[0][reason_code]', String(form.get('reason_code') ?? 'other')); data.append('items[0][reason_detail]', String(form.get('reason_detail') ?? ''))
    if (requestType === 'exchange' && form.get('replacement_variant_id')) data.append('items[0][replacement_variant_id]', String(form.get('replacement_variant_id')))
    for (const file of form.getAll('images') as File[]) if (file.size) data.append('images[]', file)
    try { await apiClient.post('/account/returns', data); toast.success('Đã gửi yêu cầu đổi / trả.'); event.currentTarget.reset(); setMode(null) } catch { toast.error('Không thể gửi yêu cầu đổi / trả.') } finally { setSaving(false) }
  }

  const submitWarranty = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    const form = new FormData(event.currentTarget)
    const data = new FormData()
    for (const [key, value] of form.entries()) if (key !== 'images') data.append(key, value)
    data.append('order_id', String(order.id)); data.set('order_item_id', String(selectedItemId))
    for (const file of form.getAll('images') as File[]) if (file.size) data.append('images[]', file)
    try { await apiClient.post('/account/warranties', data); toast.success('Đã gửi yêu cầu bảo hành.'); event.currentTarget.reset(); setMode(null) } catch { toast.error('Không thể gửi yêu cầu bảo hành.') } finally { setSaving(false) }
  }

  return <section className='mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5'>
    <h2 className='text-lg font-black'>Hỗ trợ sau bán hàng</h2><p className='muted mt-1 text-sm'>Thời hạn, số lượng và chính sách được backend kiểm tra trước khi tạo yêu cầu.</p>
    <div className='mt-4 flex flex-wrap gap-2'>{(returnsEnabled || exchangeEnabled) && <button className='btn-primary' type='button' onClick={() => { setRequestType(returnsEnabled ? 'return' : 'exchange'); setMode('return') }}>Yêu cầu đổi / trả</button>}{warrantyEnabled && <button className='btn-secondary' type='button' onClick={() => setMode('warranty')}>Yêu cầu bảo hành</button>}</div>
    {mode === 'return' && <form className='mt-5 grid gap-4 md:grid-cols-2' onSubmit={submitReturn}>
      <label><span className='label'>Sản phẩm</span><select className='input' name='order_item_id' value={selectedItemId} onChange={(event) => setSelectedItemId(Number(event.target.value))} required>{order.items.map((item) => <option key={item.id} value={item.id}>{item.product_name} · {item.sku}</option>)}</select></label>
      <label><span className='label'>Hình thức</span><select className='input' name='request_type' value={requestType} onChange={(event) => setRequestType(event.target.value as 'return' | 'exchange')}>{returnsEnabled && <option value='return'>Trả và hoàn tiền</option>}{exchangeEnabled && <option value='exchange'>Đổi biến thể cùng giá</option>}</select></label>
      <label><span className='label'>Số lượng</span><input className='input' name='quantity' type='number' min='1' max={selectedItem?.quantity} defaultValue='1' required /></label>
      <label><span className='label'>Lý do</span><select className='input' name='reason_code'><option value='not_suitable'>Không phù hợp</option><option value='defective'>Lỗi sản phẩm</option><option value='other'>Khác</option></select></label>
      <label><span className='label'>Biến thể thay thế</span><select className='input' name='replacement_variant_id' disabled={requestType !== 'exchange'} required={requestType === 'exchange'}><option value=''>Chọn khi đổi hàng</option>{selectedItem?.product?.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.sku} · {formatPrice(variant.current_price)}</option>)}</select></label>
      <label><span className='label'>Ảnh minh chứng (tối đa 5)</span><input className='input' name='images' type='file' accept='image/jpeg,image/png,image/webp' multiple /></label>
      <label className='md:col-span-2'><span className='label'>Chi tiết</span><textarea className='input min-h-24' name='reason_detail' /></label>
      <label className='md:col-span-2'><span className='label'>Ghi chú</span><textarea className='input' name='customer_note' /></label>
      <div className='flex gap-2 md:col-span-2'><button className='btn-primary' disabled={saving}>{saving ? 'Đang gửi...' : 'Gửi yêu cầu'}</button><button className='btn-secondary' type='button' onClick={() => setMode(null)}>Đóng</button></div>
    </form>}
    {mode === 'warranty' && <form className='mt-5 grid gap-4 md:grid-cols-2' onSubmit={submitWarranty}>
      <label><span className='label'>Sản phẩm</span><select className='input' name='order_item_id' value={selectedItemId} onChange={(event) => setSelectedItemId(Number(event.target.value))} required>{order.items.map((item) => <option key={item.id} value={item.id}>{item.product_name} · {item.sku}</option>)}</select></label>
      <label><span className='label'>Loại sự cố</span><input className='input' name='issue_type' defaultValue='technical' required /></label>
      <label><span className='label'>Phương án mong muốn</span><select className='input' name='requested_resolution'><option value='repair'>Sửa chữa</option><option value='replacement'>Thay thế</option></select></label>
      <label><span className='label'>Ảnh minh chứng</span><input className='input' name='images' type='file' accept='image/jpeg,image/png,image/webp' multiple /></label>
      <label className='md:col-span-2'><span className='label'>Mô tả sự cố</span><textarea className='input min-h-28' name='description' required /></label>
      <label className='md:col-span-2'><span className='label'>Ghi chú</span><textarea className='input' name='customer_note' /></label>
      <div className='flex gap-2 md:col-span-2'><button className='btn-primary' disabled={saving}>{saving ? 'Đang gửi...' : 'Gửi bảo hành'}</button><button className='btn-secondary' type='button' onClick={() => setMode(null)}>Đóng</button></div>
    </form>}
  </section>
}
