import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiClient } from '../../api/apiClient'
import { OrderTimeline } from '../../components/orders/OrderTimeline'
import { PaymentSummary, ShipmentSummary } from '../../components/orders/OrderSummaries'
import type { ApiResponse, Order, PaymentMethods } from '../../types'
import { formatPrice, statusLabel } from '../../utils/format'

export function OrderTrackingPage() {
  const [searchParams] = useSearchParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const methods = useQuery({ queryKey: ['payment-methods'], queryFn: async () => (await apiClient.get<ApiResponse<PaymentMethods>>('/payment-methods')).data.data })
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLoading(true); setError(''); setOrder(null)
    const form = new FormData(event.currentTarget)
    try { const response = await apiClient.post<ApiResponse<Order>>('/orders/track', { order_number: String(form.get('order_number') ?? ''), phone: String(form.get('phone') ?? '') }); setOrder(response.data.data) }
    catch (requestError) { setError(axios.isAxiosError(requestError) ? requestError.response?.data?.message ?? 'Không thể tra cứu đơn hàng.' : 'Không thể tra cứu đơn hàng.') }
    finally { setLoading(false) }
  }
  return <div className='container-page py-10'><div className='mx-auto max-w-4xl'><h1 className='section-title'>Tra cứu đơn hàng</h1><form className='card mt-6 grid gap-4 p-6 sm:grid-cols-[1fr_1fr_auto]' onSubmit={submit}><label><span className='label'>Mã đơn hàng</span><input className='input' name='order_number' defaultValue={searchParams.get('order') ?? ''} required /></label><label><span className='label'>Số điện thoại</span><input className='input' name='phone' required /></label><button className='btn-primary self-end' disabled={loading}>{loading ? 'Đang tra cứu...' : 'Tra cứu đơn hàng'}</button></form>{error && <div className='mt-5 rounded-xl bg-red-50 p-4 font-semibold text-red-700'>{error}</div>}{order && <div className='mt-6 grid gap-6'><section className='card p-6'><div className='flex flex-wrap justify-between gap-3'><div><p className='muted'>Mã đơn</p><h2 className='text-2xl font-black'>{order.order_number}</h2></div><strong className='rounded-full bg-emerald-50 px-4 py-2 text-emerald-800'>{statusLabel[order.order_status] ?? order.order_status}</strong></div><p className='mt-4'>{order.customer_name} · {order.customer_phone}</p><p className='muted'>{order.shipping_address}, {order.ward}, {order.district}, {order.province}</p></section><section className='card p-6'><h2 className='text-xl font-black'>Lịch sử đơn hàng</h2><OrderTimeline histories={order.status_histories} /></section><div className='grid gap-6 md:grid-cols-2'><section className='card p-6'><h2 className='text-xl font-black'>Thanh toán</h2><div className='mt-3'><PaymentSummary payment={order.payment} method={order.payment_method} status={order.payment_status} methods={methods.data} /></div></section><section className='card p-6'><h2 className='text-xl font-black'>Vận chuyển</h2><ShipmentSummary shipment={order.shipment} /></section></div><section className='card p-6'><h2 className='text-xl font-black'>Sản phẩm</h2><div className='mt-4 grid gap-3'>{order.items.map((item) => <div className='flex justify-between border-b pb-3' key={item.id}><span>{item.product_name} × {item.quantity}</span><strong>{formatPrice(item.line_total)}</strong></div>)}</div><div className='mt-4 flex justify-between text-lg'><strong>Tổng cộng</strong><strong className='price'>{formatPrice(order.total_amount)}</strong></div></section></div>}</div></div>
}
