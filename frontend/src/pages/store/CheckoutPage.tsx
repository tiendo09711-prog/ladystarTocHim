import axios from 'axios'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import type { ApiResponse, Order } from '../../types'
import { useAuth } from '../../stores/AuthContext'
import { useCart } from '../../stores/CartContext'
import { formatPrice } from '../../utils/format'

export function CheckoutPage() {
  const { user } = useAuth()
  const { items, subtotal, refresh } = useCart()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [coupon, setCoupon] = useState('')
  const [summary, setSummary] = useState({ subtotal, discount_amount: 0, shipping_fee: subtotal >= 1000000 ? 0 : 30000, total_amount: subtotal + (subtotal >= 1000000 ? 0 : 30000) })
  const preview = async () => { try { const response = await apiClient.post<ApiResponse<typeof summary>>('/checkout/preview', { coupon_code: coupon || undefined }); setSummary(response.data.data); toast.success('Đã áp dụng mã giảm giá.') } catch (error) { toast.error(axios.isAxiosError(error) ? error.response?.data?.message ?? 'Mã không hợp lệ.' : 'Mã không hợp lệ.') } }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSubmitting(true)
    const data = Object.fromEntries(new FormData(event.currentTarget).entries())
    try { const response = await apiClient.post<ApiResponse<Order>>('/checkout/place-order', { ...data, coupon_code: coupon || undefined }); await refresh(); navigate(`/dat-hang-thanh-cong/${response.data.data.order_number}`) }
    catch (error) { toast.error(axios.isAxiosError(error) ? error.response?.data?.message ?? 'Không thể đặt hàng.' : 'Không thể đặt hàng.') }
    finally { setSubmitting(false) }
  }
  return <div className="container-page py-10"><h1 className="section-title">Thanh toán</h1><form className="mt-7 grid gap-6 lg:grid-cols-[1fr_380px]" onSubmit={submit}><section className="card p-6"><h2 className="text-xl font-black">Thông tin nhận hàng</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><label><span className="label">Người nhận</span><input className="input" name="customer_name" defaultValue={user?.name} required /></label><label><span className="label">Số điện thoại</span><input className="input" name="customer_phone" defaultValue={user?.phone ?? ''} required /></label><label><span className="label">Email</span><input className="input" name="customer_email" type="email" defaultValue={user?.email} required /></label><label><span className="label">Tỉnh / thành phố</span><input className="input" name="province" required /></label><label><span className="label">Quận / huyện</span><input className="input" name="district" required /></label><label><span className="label">Phường / xã</span><input className="input" name="ward" required /></label><label className="sm:col-span-2"><span className="label">Địa chỉ cụ thể</span><input className="input" name="shipping_address" required /></label><label className="sm:col-span-2"><span className="label">Ghi chú</span><textarea className="input min-h-24" name="customer_note" /></label></div><h2 className="mt-8 text-xl font-black">Thanh toán</h2><div className="mt-4 grid gap-3"><label className="rounded-xl border p-4"><input type="radio" name="payment_method" value="cod" defaultChecked /> <strong>Thanh toán khi nhận hàng (COD)</strong></label><label className="rounded-xl border p-4"><input type="radio" name="payment_method" value="bank_transfer" /> <strong>Chuyển khoản ngân hàng</strong></label></div></section>
    <aside className="card h-fit p-6"><h2 className="text-xl font-black">Đơn hàng ({items.length})</h2><div className="mt-4 grid gap-3">{items.map((item) => <div key={item.id} className="flex justify-between gap-3 text-sm"><span>{item.variant.product.name} × {item.quantity}</span><strong>{formatPrice(item.unit_price * item.quantity)}</strong></div>)}</div><div className="mt-5 flex gap-2"><input className="input" value={coupon} onChange={(event) => setCoupon(event.target.value.toUpperCase())} placeholder="Mã giảm giá" /><button type="button" className="btn-secondary" onClick={preview}>Áp dụng</button></div><div className="mt-5 grid gap-3 border-t pt-5"><div className="flex justify-between"><span>Tạm tính</span><strong>{formatPrice(summary.subtotal)}</strong></div><div className="flex justify-between"><span>Giảm giá</span><strong>-{formatPrice(summary.discount_amount)}</strong></div><div className="flex justify-between"><span>Phí giao hàng</span><strong>{formatPrice(summary.shipping_fee)}</strong></div><div className="flex justify-between border-t pt-4 text-lg"><strong>Tổng cộng</strong><strong className="price">{formatPrice(summary.total_amount)}</strong></div></div><button className="btn-primary mt-5 w-full" disabled={submitting || !items.length}>{submitting ? 'Đang đặt hàng...' : 'Đặt hàng'}</button></aside></form></div>
}
