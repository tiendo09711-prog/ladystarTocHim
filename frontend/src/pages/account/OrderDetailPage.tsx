import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Clipboard, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { AfterSalesRequestForms } from '../../components/afterSales/AfterSalesRequestForms'
import { LoadingState } from '../../components/common/LoadingState'
import { OrderTimeline } from '../../components/orders/OrderTimeline'
import { PaymentSummary, ShipmentSummary } from '../../components/orders/OrderSummaries'
import type { ApiResponse, Order, OrderItem, PaymentMethods } from '../../types'
import { formatPrice, statusLabel } from '../../utils/format'
import { useCart } from '../../stores/CartContext'
import { copyText } from '../../utils/browserActions'

const reviewStatusLabel = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối' } as const
const emptyReview = { rating: 5, title: '', content: '' }

function apiError(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback
  const response = error.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined
  return Object.values(response?.errors ?? {})[0]?.[0] ?? response?.message ?? fallback
}

export function OrderDetailPage() {
  const { orderNumber = '' } = useParams()
  const client = useQueryClient()
  const [editingItemId, setEditingItemId] = useState<number | null>(null)
  const [reviewDraft, setReviewDraft] = useState(emptyReview)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const { refresh: refreshCart } = useCart()
  const query = useQuery({ queryKey: ['order', orderNumber], queryFn: async () => (await apiClient.get<ApiResponse<Order>>(`/account/orders/${orderNumber}`)).data.data })
  const paymentMethods = useQuery({ queryKey: ['payment-methods'], queryFn: async () => (await apiClient.get<ApiResponse<PaymentMethods>>('/payment-methods')).data.data })
  if (query.isLoading || !query.data) return <LoadingState />
  const order = query.data
  const refresh = () => client.invalidateQueries({ queryKey: ['order', orderNumber] })
  const startReview = (item: OrderItem) => {
    setEditingItemId(item.id)
    setReviewDraft({ rating: item.review?.rating ?? 5, title: item.review?.title ?? '', content: item.review?.content ?? '' })
  }
  const saveReview = async (item: OrderItem) => {
    setPendingAction(`save-${item.id}`)
    try {
      const payload = { ...reviewDraft, order_item_id: item.id, title: reviewDraft.title || null, content: reviewDraft.content || null }
      if (item.review) await apiClient.put(`/account/reviews/${item.review.id}`, payload)
      else await apiClient.post('/account/reviews', payload)
      await refresh(); setEditingItemId(null); setReviewDraft(emptyReview)
      toast.success(item.review ? 'Đã cập nhật đánh giá.' : 'Đã gửi đánh giá để duyệt.')
    } catch (error) { toast.error(apiError(error, 'Không thể lưu đánh giá.')) }
    finally { setPendingAction(null) }
  }
  const deleteReview = async (item: OrderItem) => {
    if (!item.review || !confirm(`Xóa đánh giá cho ${item.product_name}?`)) return
    setPendingAction(`delete-${item.id}`)
    try { await apiClient.delete(`/account/reviews/${item.review.id}`); await refresh(); toast.success('Đã xóa đánh giá.') }
    catch (error) { toast.error(apiError(error, 'Không thể xóa đánh giá.')) }
    finally { setPendingAction(null) }
  }
  const cancel = async () => {
    setPendingAction('cancel')
    try { await apiClient.post(`/account/orders/${orderNumber}/cancel`); await refresh(); toast.success('Đã hủy đơn hàng.') }
    catch (error) { toast.error(apiError(error, 'Không thể hủy đơn.')) }
    finally { setPendingAction(null) }
  }
  const buyAgain = async () => {
    setPendingAction('buy-again')
    try {
      const response = await apiClient.post<ApiResponse<{ added: unknown[]; skipped: Array<{ product_name: string; reason: string }> }>>(`/account/orders/${orderNumber}/buy-again`)
      await refreshCart()
      const result = response.data.data
      toast.success(`Đã thêm ${result.added.length} sản phẩm vào giỏ hàng.${result.skipped.length ? ` Bỏ qua ${result.skipped.length} sản phẩm không còn khả dụng.` : ''}`)
    } catch (error) { toast.error(apiError(error, 'Không thể mua lại đơn hàng.')) }
    finally { setPendingAction(null) }
  }
  return <div className='card p-6'>
    <div className='flex flex-wrap items-start justify-between gap-4'><div><div className='muted'>Mã đơn</div><div className='flex items-center gap-2'><h1 className='text-2xl font-black'>{order.order_number}</h1><button type='button' aria-label='Sao chép mã đơn' onClick={() => void copyText(order.order_number).then(() => toast.success('Đã sao chép'))}><Clipboard size={17} /></button></div></div><div className='flex flex-wrap items-center gap-2'>{order.can_buy_again && <button className='btn-secondary' disabled={pendingAction !== null} onClick={() => void buyAgain()}><RotateCcw size={17} />{pendingAction === 'buy-again' ? 'Đang thêm...' : 'Mua lại'}</button>}<span className='rounded-full bg-emerald-50 px-3 py-2 font-bold text-emerald-800'>{statusLabel[order.order_status]}</span></div></div>
    <div className='mt-6 grid gap-5 md:grid-cols-2'><div className='rounded-2xl bg-slate-50 p-5'><h2 className='font-black'>Người nhận</h2><p className='mt-2'>{order.customer_name} · {order.customer_phone}</p><p className='muted mt-1'>{order.shipping_address}</p></div><div className='rounded-2xl bg-slate-50 p-5'><h2 className='font-black'>Thanh toán</h2><p className='mt-2'>{order.payment_method === 'cod' ? 'Thanh toán khi nhận hàng' : 'Chuyển khoản'}</p><p className='muted mt-1'>{statusLabel[order.payment_status]}</p></div></div>
    <div className='mt-6 grid gap-5 md:grid-cols-2'><section className='rounded-2xl border p-5'><h2 className='font-black'>Lịch sử đơn hàng</h2><OrderTimeline histories={order.status_histories} /></section><section className='rounded-2xl border p-5'><h2 className='font-black'>Thanh toán chi tiết</h2><div className='mt-3'><PaymentSummary payment={order.payment} method={order.payment_method} status={order.payment_status} methods={paymentMethods.data} /></div></section><section className='rounded-2xl border p-5 md:col-span-2'><h2 className='font-black'>Vận chuyển</h2><ShipmentSummary shipment={order.shipment} /></section></div>
    <div className='mt-6 grid gap-4'>{order.items.map((item) => <article key={item.id} className='rounded-2xl border p-5'><div className='flex flex-wrap justify-between gap-3'><div><strong>{item.product_name}</strong><div className='muted mt-1 flex items-center gap-2 text-sm'>SKU: {item.sku} · Số lượng: {item.quantity}<button type='button' aria-label='Sao chép SKU' onClick={() => void copyText(item.sku).then(() => toast.success('Đã sao chép'))}><Clipboard size={14} /></button></div></div><strong>{formatPrice(item.line_total)}</strong></div>{item.after_sales_eligibility && <div className='mt-4 grid gap-2 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-2'><Countdown label='Đổi trả' value={item.after_sales_eligibility.return} /><Countdown label='Bảo hành' value={item.after_sales_eligibility.warranty} /></div>}
      {order.order_status === 'completed' && <div className='mt-4 border-t pt-4'>{item.review ? <div className='rounded-xl bg-slate-50 p-4'><div className='flex flex-wrap items-center justify-between gap-2'><strong>{'★'.repeat(item.review.rating)}{'☆'.repeat(5 - item.review.rating)}</strong><span className='rounded-full bg-white px-2 py-1 text-xs font-bold'>{reviewStatusLabel[item.review.status]}</span></div>{item.review.title && <h3 className='mt-2 font-bold'>{item.review.title}</h3>}{item.review.content && <p className='muted mt-1 whitespace-pre-wrap'>{item.review.content}</p>}{item.review.admin_reply && <p className='mt-3 rounded-lg bg-emerald-50 p-3 text-sm'><strong>Phản hồi từ cửa hàng:</strong> {item.review.admin_reply}</p>}<div className='mt-3 flex gap-2'><button className='btn-secondary px-3' onClick={() => startReview(item)}>Sửa đánh giá</button><button className='btn-secondary px-3 text-red-700' disabled={pendingAction === `delete-${item.id}`} onClick={() => void deleteReview(item)}>{pendingAction === `delete-${item.id}` ? 'Đang xóa...' : 'Xóa đánh giá'}</button></div></div> : editingItemId !== item.id && <button className='btn-secondary' onClick={() => startReview(item)}>Đánh giá sản phẩm</button>}
        {editingItemId === item.id && <div className='mt-4 grid gap-3 rounded-xl bg-emerald-50/60 p-4'><div><span className='label'>Số sao</span><div className='flex gap-2'>{[1, 2, 3, 4, 5].map((rating) => <button key={rating} type='button' aria-label={`${rating} sao`} className={`text-2xl ${rating <= reviewDraft.rating ? 'text-amber-500' : 'text-slate-300'}`} onClick={() => setReviewDraft((current) => ({ ...current, rating }))}>★</button>)}</div></div><label><span className='label'>Tiêu đề</span><input className='input' maxLength={190} value={reviewDraft.title} onChange={(event) => setReviewDraft((current) => ({ ...current, title: event.target.value }))} /></label><label><span className='label'>Nội dung</span><textarea className='input min-h-28' maxLength={3000} value={reviewDraft.content} onChange={(event) => setReviewDraft((current) => ({ ...current, content: event.target.value }))} /></label><div className='flex gap-2'><button className='btn-primary' disabled={pendingAction === `save-${item.id}`} onClick={() => void saveReview(item)}>{pendingAction === `save-${item.id}` ? 'Đang lưu...' : 'Lưu đánh giá'}</button><button className='btn-secondary' onClick={() => setEditingItemId(null)}>Hủy</button></div></div>}
      </div>}</article>)}</div>
    <AfterSalesRequestForms order={order} />
    <div className='mt-6 ml-auto max-w-sm space-y-2'><div className='flex justify-between'><span>Tạm tính</span><strong>{formatPrice(order.subtotal)}</strong></div><div className='flex justify-between'><span>Giảm giá</span><strong>-{formatPrice(order.discount_amount)}</strong></div><div className='flex justify-between'><span>Phí giao hàng</span><strong>{formatPrice(order.shipping_fee)}</strong></div><div className='flex justify-between border-t pt-3 text-lg'><strong>Tổng cộng</strong><strong className='price'>{formatPrice(order.total_amount)}</strong></div></div>
    {order.order_status === 'pending' && <button className='btn-secondary mt-6 border-red-200 text-red-700' disabled={pendingAction === 'cancel'} onClick={() => void cancel()}>{pendingAction === 'cancel' ? 'Đang hủy...' : 'Hủy đơn hàng'}</button>}
  </div>
}

function Countdown({ label, value }: { label: string; value?: { eligible: boolean; expires_at?: string | null; days_remaining?: number | null; reason_if_not_eligible?: string | null } }) {
  if (!value?.expires_at) return <div><strong>{label}</strong><p className='muted mt-1'>Chưa có thời hạn áp dụng.</p></div>
  const date = new Date(value.expires_at).toLocaleDateString('vi-VN')
  return <div><strong>{label}</strong><p className={`mt-1 ${value.eligible ? 'text-emerald-800' : 'text-slate-500'}`}>{value.eligible ? `Còn ${value.days_remaining ?? 0} ngày để gửi yêu cầu.` : `Thời hạn đã kết thúc ngày ${date}.`}</p></div>
}
