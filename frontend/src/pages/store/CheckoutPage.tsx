import axios from 'axios'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import type { ApiResponse, Order } from '../../types'
import { useAuth } from '../../stores/AuthContext'
import { useCart } from '../../stores/CartContext'
import { formatPrice } from '../../utils/format'

interface Summary { subtotal: number; discount_amount: number; shipping_fee: number; total_amount: number }

export function CheckoutPage() {
  const { user } = useAuth()
  const { items, subtotal, clear, refresh } = useCart()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [coupon, setCoupon] = useState('')
  const [summary, setSummary] = useState<Summary>({ subtotal, discount_amount: 0, shipping_fee: 0, total_amount: subtotal })
  useEffect(() => setSummary((current) => ({ ...current, subtotal, total_amount: subtotal + current.shipping_fee - current.discount_amount })), [subtotal])
  const guestItems = items.map((item) => ({ product_variant_id: item.product_variant_id, quantity: item.quantity }))
  const preview = async () => {
    try {
      const endpoint = user ? '/checkout/preview' : '/guest-checkout/preview'
      const payload = user ? { coupon_code: coupon || undefined } : { items: guestItems, coupon_code: coupon || undefined }
      const response = await apiClient.post<ApiResponse<Summary>>(endpoint, payload)
      setSummary(response.data.data)
      toast.success('Đã cập nhật tóm tắt đơn hàng.')
    } catch (error) { toast.error(axios.isAxiosError(error) ? error.response?.data?.message ?? 'Mã không hợp lệ.' : 'Mã không hợp lệ.') }
  }
  useEffect(() => { if (items.length) void preview() }, [items.length, user])
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSubmitting(true)
    const data = Object.fromEntries(new FormData(event.currentTarget).entries())
    try {
      const endpoint = user ? '/checkout/place-order' : '/guest-checkout/place-order'
      const payload = user ? { ...data, coupon_code: coupon || undefined } : { ...data, items: guestItems, coupon_code: coupon || undefined }
      const response = await apiClient.post<ApiResponse<Order>>(endpoint, payload)
      if (user) await refresh(); else await clear()
      navigate('/dat-hang-thanh-cong/' + response.data.data.order_number)
    } catch (error) { toast.error(axios.isAxiosError(error) ? error.response?.data?.message ?? 'Không thể đặt hàng.' : 'Không thể đặt hàng.') }
    finally { setSubmitting(false) }
  }
  if (!items.length) return <div className='container-page py-16 text-center'><h1 className='section-title'>Giỏ hàng đang trống</h1><Link className='btn-primary mt-6' to='/san-pham'>Tiếp tục mua sắm</Link></div>
  return <div className='container-page py-10'><h1 className='section-title'>Thanh toán</h1><form className='mt-7 grid gap-6 lg:grid-cols-[1fr_420px]' onSubmit={submit}>
    <section className='card p-6'><h2 className='text-xl font-black'>THÔNG TIN THANH TOÁN</h2><div className='mt-5 grid gap-4 sm:grid-cols-2'><label><span className='label'>Người nhận</span><input className='input' name='customer_name' defaultValue={user?.name} required /></label><label><span className='label'>Số điện thoại</span><input className='input' name='customer_phone' defaultValue={user?.phone ?? ''} required /></label><label><span className='label'>Email</span><input className='input' name='customer_email' type='email' defaultValue={user?.email} required /></label><label><span className='label'>Tỉnh / thành phố</span><input className='input' name='province' required /></label><label><span className='label'>Quận / huyện</span><input className='input' name='district' required /></label><label><span className='label'>Phường / xã</span><input className='input' name='ward' required /></label><label className='sm:col-span-2'><span className='label'>Địa chỉ cụ thể</span><input className='input' name='shipping_address' required /></label><label className='sm:col-span-2'><span className='label'>Ghi chú</span><textarea className='input min-h-24' name='customer_note' /></label></div><h2 className='mt-8 text-xl font-black'>PHƯƠNG THỨC THANH TOÁN</h2><div className='mt-4 grid gap-3'><label className='rounded-xl border p-4'><input type='radio' name='payment_method' value='cod' defaultChecked /> <strong>Thanh toán khi nhận hàng (COD)</strong></label><label className='rounded-xl border p-4'><input type='radio' name='payment_method' value='bank_transfer' /> <strong>Chuyển khoản ngân hàng</strong></label></div></section>
    <aside className='card h-fit p-6'><h2 className='text-xl font-black'>THÔNG TIN ĐƠN HÀNG</h2><div className='mt-4 grid gap-4'>{items.map((item) => <article key={item.id} className='flex gap-3 border-b pb-4'><img src={item.variant.product.images?.[0]?.image_path || '/images/product-placeholder.svg'} alt={item.variant.product.name} className='h-20 w-20 rounded-xl object-cover' /><div className='min-w-0 flex-1'><strong>{item.variant.product.name}</strong>{item.variant.attributes.map((attribute) => <div className='mt-1 text-xs text-slate-500' key={attribute.attribute_id}>{attribute.attribute_name || 'Tùy chọn'}: {attribute.value}{attribute.option_code ? ' (' + attribute.option_code + ')' : ''}</div>)}<div className='mt-2 text-sm'>{formatPrice(item.unit_price)} × {item.quantity}</div></div></article>)}</div><div className='mt-5 flex gap-2'><input className='input' value={coupon} onChange={(event) => setCoupon(event.target.value.toUpperCase())} placeholder='Mã giảm giá' /><button type='button' className='btn-secondary' onClick={preview}>Áp dụng</button></div><div className='mt-5 grid gap-3 border-t pt-5'><div className='flex justify-between'><span>Tạm tính</span><strong>{formatPrice(summary.subtotal)}</strong></div><div className='flex justify-between'><span>Giảm giá</span><strong>-{formatPrice(summary.discount_amount)}</strong></div><div className='flex justify-between'><span>Phí giao hàng</span><strong>{formatPrice(summary.shipping_fee)}</strong></div><div className='flex justify-between border-t pt-4 text-lg'><strong>Tổng cộng</strong><strong className='price'>{formatPrice(summary.total_amount)}</strong></div></div><button className='btn-primary mt-5 w-full' disabled={submitting}>{submitting ? 'Đang đặt hàng...' : 'THANH TOÁN'}</button></aside>
  </form></div>
}
