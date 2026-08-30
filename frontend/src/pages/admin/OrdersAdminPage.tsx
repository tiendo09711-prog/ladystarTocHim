import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Clipboard, PackageCheck, Printer } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { LoadingState } from '../../components/common/LoadingState'
import { OrderTimeline } from '../../components/orders/OrderTimeline'
import { ShipmentSummary } from '../../components/orders/OrderSummaries'
import type { ApiResponse, Order, Pagination } from '../../types'
import { formatPrice, statusLabel } from '../../utils/format'
import { useAuth } from '../../stores/AuthContext'
import { can } from '../../features/auth/permissions'
import { copyText } from '../../utils/browserActions'

function apiError(error: unknown, fallback: string) {
  return axios.isAxiosError(error) ? error.response?.data?.message ?? fallback : fallback
}

export function OrdersAdminPage() {
  const [params, setParams] = useSearchParams()
  const filters = Object.fromEntries([...params.entries()].filter(([, value]) => value))
  const query = useQuery({ queryKey: ['admin-orders', filters], queryFn: async () => (await apiClient.get<ApiResponse<Pagination<Order>>>('/admin/orders', { params: filters })).data.data })
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); next.delete('page'); setParams(next) }
  return <div><div className='mb-6'><h1 className='text-3xl font-black'>Đơn hàng</h1><p className='muted'>Theo dõi và xử lý vòng đời đơn hàng.</p></div><div className='card mb-5 grid gap-3 p-4 md:grid-cols-3'><input className='input' placeholder='Mã đơn, khách hàng, điện thoại' value={params.get('search') ?? ''} onChange={(event) => update('search', event.target.value)} /><select className='input' value={params.get('status') ?? ''} onChange={(event) => update('status', event.target.value)}><option value=''>Tất cả trạng thái</option>{['pending', 'confirmed', 'processing', 'shipping', 'completed', 'cancelled'].map((item) => <option key={item} value={item}>{statusLabel[item]}</option>)}</select><select className='input' value={params.get('payment_status') ?? ''} onChange={(event) => update('payment_status', event.target.value)}><option value=''>Tất cả thanh toán</option><option value='unpaid'>Chưa thanh toán</option><option value='paid'>Đã thanh toán</option></select></div>{query.isLoading ? <LoadingState /> : <div className='table-wrap'><table className='table'><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Tổng tiền</th><th>Thanh toán</th><th>Trạng thái</th><th>Ngày đặt</th><th></th></tr></thead><tbody>{query.data?.data.map((order) => <tr key={order.id}><td><div className='flex items-center gap-2 font-bold'>{order.order_number}<button aria-label='Sao chép mã đơn' onClick={() => void copyText(order.order_number).then(() => toast.success('Đã sao chép'))}><Clipboard size={14} /></button></div></td><td>{order.customer_name}</td><td className='price'>{formatPrice(order.total_amount)}</td><td>{statusLabel[order.payment_status]}</td><td>{statusLabel[order.order_status]}</td><td>{new Date(order.created_at).toLocaleDateString('vi-VN')}</td><td><Link className='font-bold text-emerald-800' to={`/admin/orders/${order.id}`}>Chi tiết</Link></td></tr>)}</tbody></table></div>}</div>
}

export function AdminOrderDetailPage() {
  const { user } = useAuth()
  const canStatus = can(user, 'orders.status.manage')
  const canPayment = can(user, 'orders.payment.manage')
  const canShipment = can(user, 'orders.shipment.manage')
  const canNotes = can(user, 'orders.notes.manage')
  const { id } = useParams()
  const client = useQueryClient()
  const [paymentStatus, setPaymentStatus] = useState('unpaid')
  const [adminNote, setAdminNote] = useState('')
  const [transactionCode, setTransactionCode] = useState('')
  const [shipment, setShipment] = useState({ carrier: '', tracking_number: '', shipping_fee_actual: '', tracking_url: '', note: '' })
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [printMode, setPrintMode] = useState<'order' | 'packing' | null>(null)
  const query = useQuery({ queryKey: ['admin-order', id], queryFn: async () => (await apiClient.get<ApiResponse<Order>>(`/admin/orders/${id}`)).data.data })
  useEffect(() => { if (query.data) { setPaymentStatus(query.data.payment_status); setAdminNote(query.data.admin_note ?? ''); setTransactionCode(query.data.payment?.transaction_code ?? ''); setShipment({ carrier: query.data.shipment?.carrier ?? '', tracking_number: query.data.shipment?.tracking_number ?? '', shipping_fee_actual: query.data.shipment?.shipping_fee_actual?.toString() ?? '', tracking_url: query.data.shipment?.tracking_url ?? '', note: query.data.shipment?.note ?? '' }) } }, [query.data])
  if (query.isLoading || !query.data) return <LoadingState />
  const order = query.data
  const refresh = () => client.invalidateQueries({ queryKey: ['admin-order', id] })
  const updateStatus = async (order_status: string) => {
    setPendingAction(`status-${order_status}`)
    try { await apiClient.patch(`/admin/orders/${id}/status`, { order_status }); await refresh(); toast.success('Đã cập nhật trạng thái.') }
    catch (error) { toast.error(apiError(error, 'Chuyển trạng thái không hợp lệ.')) }
    finally { setPendingAction(null) }
  }
  const updatePayment = async () => {
    setPendingAction('payment')
    try { await apiClient.patch(`/admin/orders/${id}/payment-status`, { payment_status: paymentStatus, transaction_code: transactionCode || null }); await refresh(); toast.success('Đã cập nhật trạng thái thanh toán.') }
    catch (error) { toast.error(apiError(error, 'Không thể cập nhật trạng thái thanh toán.')) }
    finally { setPendingAction(null) }
  }
  const saveNote = async () => {
    setPendingAction('note')
    try { await apiClient.post(`/admin/orders/${id}/notes`, { admin_note: adminNote || null }); await refresh(); toast.success('Đã lưu ghi chú nội bộ.') }
    catch (error) { toast.error(apiError(error, 'Không thể lưu ghi chú nội bộ.')) }
    finally { setPendingAction(null) }
  }
  const saveShipment = async () => {
    setPendingAction('shipment-save')
    try { await apiClient.put(`/admin/orders/${id}/shipment`, { carrier: shipment.carrier, tracking_number: shipment.tracking_number || null, shipping_fee_actual: shipment.shipping_fee_actual ? Number(shipment.shipping_fee_actual) : null, tracking_url: shipment.tracking_url || null, note: shipment.note || null }); await refresh(); toast.success('Đã lưu thông tin vận chuyển.') }
    catch (error) { toast.error(apiError(error, 'Không thể lưu thông tin vận chuyển.')) }
    finally { setPendingAction(null) }
  }
  const updateShipmentStatus = async (status: 'shipped' | 'delivered') => {
    setPendingAction(`shipment-${status}`)
    try { await apiClient.patch(`/admin/orders/${id}/shipment/status`, { status }); await refresh(); toast.success(status === 'shipped' ? 'Đã bàn giao đơn vị vận chuyển.' : 'Đã đánh dấu giao thành công.') }
    catch (error) { toast.error(apiError(error, 'Không thể cập nhật vận chuyển.')) }
    finally { setPendingAction(null) }
  }
  const next: Record<string, string[]> = { pending: ['confirmed', 'cancelled'], confirmed: ['processing', 'cancelled'], processing: ['cancelled'], shipping: [], completed: [], cancelled: [] }
  const print = (mode: 'order' | 'packing') => { setPrintMode(mode); window.setTimeout(() => window.print(), 50) }
  return <div><div className='admin-screen-content'><div className='mb-6 flex flex-wrap items-center justify-between gap-3'><div><div className='muted'>Chi tiết đơn</div><div className='flex items-center gap-2'><h1 className='text-3xl font-black'>{order.order_number}</h1><button aria-label='Sao chép mã đơn' onClick={() => void copyText(order.order_number).then(() => toast.success('Đã sao chép'))}><Clipboard size={17} /></button></div></div><div className='flex flex-wrap gap-2'><button className='btn-secondary' onClick={() => print('order')}><Printer size={17} />In đơn hàng</button><button className='btn-secondary' onClick={() => print('packing')}><PackageCheck size={17} />In phiếu đóng hàng</button><span className='rounded-full bg-emerald-50 px-4 py-2 font-bold text-emerald-800'>{statusLabel[order.order_status]}</span></div></div><div className='grid gap-6 lg:grid-cols-3'>
    <section className='card p-6 lg:col-span-2'><h2 className='text-xl font-black'>Sản phẩm</h2><div className='mt-4 table-wrap'><table className='table'><thead><tr><th>Tên</th><th>SKU</th><th>SL</th><th>Thành tiền</th></tr></thead><tbody>{order.items.map((item) => <tr key={item.id}><td><strong>{item.product_name}</strong>{item.variant_snapshot?.map((option) => <div className='muted text-xs' key={option.attribute_code}>{option.attribute_name}: {option.value}{option.option_code ? ' (' + option.option_code + ')' : ''}</div>) || <div className='muted text-xs'>{item.variant_description}</div>}</td><td>{item.sku}</td><td>{item.quantity}</td><td>{formatPrice(item.line_total)}</td></tr>)}</tbody></table></div></section>
    <section className='card p-6 lg:col-span-2'><h2 className='text-xl font-black'>Lịch sử đơn hàng</h2><OrderTimeline histories={order.status_histories} /></section>
    <section className='card p-6 lg:col-span-2'><h2 className='text-xl font-black'>Vận chuyển</h2><ShipmentSummary shipment={order.shipment} />{canShipment && <><div className='mt-5 grid gap-3 sm:grid-cols-2'><label><span className='label'>Đơn vị vận chuyển</span><input className='input' value={shipment.carrier} onChange={(event) => setShipment((current) => ({ ...current, carrier: event.target.value }))} /></label><label><span className='label'>Mã vận đơn</span><input className='input' value={shipment.tracking_number} onChange={(event) => setShipment((current) => ({ ...current, tracking_number: event.target.value }))} /></label><label><span className='label'>Phí ship thực tế</span><input className='input' type='number' min='0' value={shipment.shipping_fee_actual} onChange={(event) => setShipment((current) => ({ ...current, shipping_fee_actual: event.target.value }))} /></label><label><span className='label'>Tracking URL</span><input className='input' type='url' value={shipment.tracking_url} onChange={(event) => setShipment((current) => ({ ...current, tracking_url: event.target.value }))} /></label><label className='sm:col-span-2'><span className='label'>Ghi chú vận chuyển</span><textarea className='input min-h-20' value={shipment.note} onChange={(event) => setShipment((current) => ({ ...current, note: event.target.value }))} /></label></div><div className='mt-4 flex flex-wrap gap-2'><button className='btn-secondary' disabled={pendingAction !== null || !['confirmed', 'processing'].includes(order.order_status)} onClick={() => void saveShipment()}>Lưu thông tin vận chuyển</button>{order.order_status === 'processing' && <button className='btn-primary' disabled={pendingAction !== null || !shipment.carrier || !shipment.tracking_number} onClick={() => void updateShipmentStatus('shipped')}>Bàn giao đơn vị vận chuyển</button>}{order.order_status === 'shipping' && <button className='btn-primary' disabled={pendingAction !== null} onClick={() => void updateShipmentStatus('delivered')}>Đánh dấu giao thành công</button>}</div></>}</section>
    <aside className='grid h-fit gap-5'><div className='card p-5'><h2 className='font-black'>Khách hàng</h2><p className='mt-2'>{order.customer_name}</p><p className='muted'>{order.customer_phone}</p><p className='muted mt-2'>{order.shipping_address}</p></div>
      {canStatus && <div className='card p-5'><h2 className='font-black'>Cập nhật trạng thái</h2><div className='mt-3 grid gap-2'>{next[order.order_status].map((item) => <button key={item} className={item === 'cancelled' ? 'btn-secondary text-red-700' : 'btn-primary'} disabled={pendingAction === `status-${item}`} onClick={() => void updateStatus(item)}>{pendingAction === `status-${item}` ? 'Đang cập nhật...' : statusLabel[item]}</button>)}</div></div>}
      <div className='card p-5'><h2 className='font-black'>Thanh toán</h2><p className='muted mt-2 text-sm'>Phương thức: {order.payment_method === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : 'Chuyển khoản ngân hàng'}</p><p className='muted mt-1 text-sm'>Số tiền: {formatPrice(order.payment?.amount ?? order.total_amount)}</p>{order.payment?.paid_at && <p className='muted mt-1 text-sm'>Ngày thanh toán: {new Date(order.payment.paid_at).toLocaleString('vi-VN')}</p>}{canPayment && <><label className='mt-3 block'><span className='label'>Trạng thái thanh toán</span><select className='input' value={paymentStatus} disabled={pendingAction === 'payment'} onChange={(event) => setPaymentStatus(event.target.value)}><option value='unpaid'>Chưa thanh toán</option><option value='paid'>Đã thanh toán</option></select></label>{order.payment_method === 'bank_transfer' && <label className='mt-3 block'><span className='label'>Mã giao dịch (không bắt buộc)</span><input className='input' value={transactionCode} onChange={(event) => setTransactionCode(event.target.value)} /></label>}<button className='btn-primary mt-3 w-full' disabled={pendingAction === 'payment' || (paymentStatus === order.payment_status && transactionCode === (order.payment?.transaction_code ?? ''))} onClick={() => void updatePayment()}>{pendingAction === 'payment' ? 'Đang lưu...' : 'Lưu thanh toán'}</button></>}<p className='muted mt-2 text-xs'>Hoàn tiền được xử lý trong module Đổi / Trả để giữ đúng lịch sử giao dịch.</p></div>
      <div className='card p-5'><h2 className='font-black'>Ghi chú nội bộ</h2><p className='muted mt-1 text-xs'>Chỉ quản trị viên nhìn thấy ghi chú này.</p>{canNotes ? <><textarea className='input mt-3 min-h-28' maxLength={3000} value={adminNote} disabled={pendingAction === 'note'} onChange={(event) => setAdminNote(event.target.value)} /><div className='muted mt-1 text-right text-xs'>{adminNote.length}/3000</div><button className='btn-primary mt-3 w-full' disabled={pendingAction === 'note' || adminNote === (order.admin_note ?? '')} onClick={() => void saveNote()}>{pendingAction === 'note' ? 'Đang lưu...' : 'Lưu ghi chú'}</button></> : <p className='mt-3 whitespace-pre-wrap text-sm'>{order.admin_note || 'Chưa có ghi chú.'}</p>}</div>
      <div className='card p-5'><div className='flex justify-between'><span>Tạm tính</span><strong>{formatPrice(order.subtotal)}</strong></div><div className='mt-2 flex justify-between'><span>Giảm giá</span><strong>-{formatPrice(order.discount_amount)}</strong></div><div className='mt-2 flex justify-between'><span>Phí giao hàng</span><strong>{formatPrice(order.shipping_fee)}</strong></div><div className='mt-3 flex justify-between border-t pt-3 text-lg'><strong>Tổng</strong><strong className='price'>{formatPrice(order.total_amount)}</strong></div></div>
    </aside></div></div>{printMode && <OrderPrintDocument order={order} packing={printMode === 'packing'} />}</div>
}

function OrderPrintDocument({ order, packing }: { order: Order; packing: boolean }) {
  return <section className='print-document hidden bg-white p-8 text-black'><header className='border-b pb-4'><h1 className='text-2xl font-black'>{packing ? 'PHIẾU ĐÓNG HÀNG' : 'ĐƠN HÀNG'}</h1><p className='mt-1'>LADYSTARS · {order.order_number}</p><p>{new Date(order.created_at).toLocaleString('vi-VN')}</p></header><div className='mt-5 grid grid-cols-2 gap-6'><div><strong>Khách hàng</strong><p>{order.customer_name}</p><p>{order.customer_phone}</p><p>{order.shipping_address}</p></div>{!packing && <div><strong>Trạng thái</strong><p>{statusLabel[order.order_status]}</p><p>{statusLabel[order.payment_status]} · {order.payment_method}</p></div>}</div><table className='mt-6 w-full border-collapse text-sm'><thead><tr><th className='border p-2 text-left'>Sản phẩm</th><th className='border p-2 text-left'>SKU / Phân loại</th><th className='border p-2 text-right'>SL</th>{!packing && <><th className='border p-2 text-right'>Đơn giá</th><th className='border p-2 text-right'>Thành tiền</th></>}</tr></thead><tbody>{order.items.map((item) => <tr key={item.id}><td className='border p-2'>{item.product_name}</td><td className='border p-2'>{item.sku}<div>{item.variant_description}</div></td><td className='border p-2 text-right'>{item.quantity}</td>{!packing && <><td className='border p-2 text-right'>{formatPrice(item.unit_price)}</td><td className='border p-2 text-right'>{formatPrice(item.line_total)}</td></>}</tr>)}</tbody></table>{packing ? <div className='mt-5'><strong>Ghi chú giao hàng</strong><p>{order.shipment?.note || 'Không có'}</p></div> : <div className='ml-auto mt-5 max-w-sm space-y-2'><div className='flex justify-between'><span>Tạm tính</span><strong>{formatPrice(order.subtotal)}</strong></div><div className='flex justify-between'><span>Giảm giá</span><strong>-{formatPrice(order.discount_amount)}</strong></div><div className='flex justify-between'><span>Phí giao hàng</span><strong>{formatPrice(order.shipping_fee)}</strong></div><div className='flex justify-between border-t pt-2 text-lg'><strong>Tổng</strong><strong>{formatPrice(order.total_amount)}</strong></div></div>}</section>
}
