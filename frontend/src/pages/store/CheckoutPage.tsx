import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { manualShippingFields, shippingFieldsFromAddress, type ShippingFields } from '../../features/checkout/address'
import { useAuth } from '../../stores/AuthContext'
import { useCart } from '../../stores/CartContext'
import type { Address, ApiResponse, Order, PaymentMethods } from '../../types'
import { formatPrice } from '../../utils/format'

interface Summary { subtotal: number; discount_amount: number; shipping_fee: number; total_amount: number }
type AddressSelection = number | 'manual' | null

export function CheckoutPage() {
  const { user } = useAuth()
  const { items, subtotal, clear, refresh } = useCart()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [coupon, setCoupon] = useState('')
  const [shipping, setShipping] = useState<ShippingFields>(() => manualShippingFields(user))
  const [selectedAddressId, setSelectedAddressId] = useState<AddressSelection>(user ? null : 'manual')
  const [summary, setSummary] = useState<Summary>({ subtotal, discount_amount: 0, shipping_fee: 0, total_amount: subtotal })
  const addresses = useQuery({ queryKey: ['addresses'], enabled: Boolean(user), queryFn: async () => (await apiClient.get<ApiResponse<Address[]>>('/account/addresses')).data.data })
  const paymentMethods = useQuery({ queryKey: ['payment-methods'], queryFn: async () => (await apiClient.get<ApiResponse<PaymentMethods>>('/payment-methods')).data.data })
  useEffect(() => setSummary((current) => ({ ...current, subtotal, total_amount: subtotal + current.shipping_fee - current.discount_amount })), [subtotal])
  useEffect(() => { setShipping(manualShippingFields(user)); setSelectedAddressId(user ? null : 'manual') }, [user])
  useEffect(() => {
    if (!user || !addresses.data || selectedAddressId !== null) return
    const address = addresses.data.find((item) => item.is_default) ?? addresses.data[0]
    if (address) { setSelectedAddressId(address.id); setShipping(shippingFieldsFromAddress(address, user.email)) }
    else setSelectedAddressId('manual')
  }, [addresses.data, selectedAddressId, user])
  const guestItems = items.map((item) => ({ product_variant_id: item.product_variant_id, quantity: item.quantity }))
  const preview = async () => {
    try {
      const endpoint = user ? '/checkout/preview' : '/guest-checkout/preview'
      const payload = user ? { coupon_code: coupon || undefined } : { items: guestItems, coupon_code: coupon || undefined }
      const response = await apiClient.post<ApiResponse<Summary>>(endpoint, payload)
      setSummary(response.data.data); toast.success('Đã cập nhật tóm tắt đơn hàng.')
    } catch (error) { toast.error(axios.isAxiosError(error) ? error.response?.data?.message ?? 'Mã không hợp lệ.' : 'Mã không hợp lệ.') }
  }
  useEffect(() => { if (items.length) void preview() }, [items.length, user])
  const selectAddress = (selection: AddressSelection) => {
    setSelectedAddressId(selection)
    if (selection === 'manual') setShipping(manualShippingFields(user))
    else {
      const address = addresses.data?.find((item) => item.id === selection)
      if (address) setShipping(shippingFieldsFromAddress(address, user?.email ?? ''))
    }
  }
  const updateShipping = (field: keyof ShippingFields, value: string) => {
    setSelectedAddressId('manual')
    setShipping((current) => ({ ...current, [field]: value }))
  }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSubmitting(true)
    const form = new FormData(event.currentTarget)
    const data = { ...shipping, customer_note: String(form.get('customer_note') ?? ''), payment_method: String(form.get('payment_method') ?? 'cod') }
    try {
      const endpoint = user ? '/checkout/place-order' : '/guest-checkout/place-order'
      const payload = user ? { ...data, coupon_code: coupon || undefined } : { ...data, items: guestItems, coupon_code: coupon || undefined }
      const response = await apiClient.post<ApiResponse<Order>>(endpoint, payload)
      if (user) await refresh(); else await clear()
      navigate('/dat-hang-thanh-cong/' + response.data.data.order_number + (data.payment_method === 'bank_transfer' ? '?payment_method=bank_transfer' : ''), { state: { order: response.data.data, paymentMethods: paymentMethods.data } })
    } catch (error) { toast.error(axios.isAxiosError(error) ? error.response?.data?.message ?? 'Không thể đặt hàng.' : 'Không thể đặt hàng.') }
    finally { setSubmitting(false) }
  }
  if (!items.length) return <div className='container-page py-16 text-center'><h1 className='section-title'>Giỏ hàng đang trống</h1><Link className='btn-primary mt-6' to='/san-pham'>Tiếp tục mua sắm</Link></div>
  const fields: Array<[keyof ShippingFields, string, string?]> = [['customer_name', 'Người nhận'], ['customer_phone', 'Số điện thoại'], ['customer_email', 'Email', 'email'], ['province', 'Tỉnh / thành phố'], ['district', 'Quận / huyện'], ['ward', 'Phường / xã'], ['shipping_address', 'Địa chỉ cụ thể']]
  return <div className='container-page py-10'><h1 className='section-title'>Thanh toán</h1><form className='mt-7 grid gap-6 lg:grid-cols-[1fr_420px]' onSubmit={submit}>
    <section className='card p-6'><h2 className='text-xl font-black'>THÔNG TIN THANH TOÁN</h2>
      {user && <div className='mt-5 rounded-2xl bg-slate-50 p-5'><h3 className='font-black'>Chọn địa chỉ giao hàng</h3>{addresses.isLoading ? <p className='muted mt-3'>Đang tải địa chỉ...</p> : addresses.isError ? <p className='mt-3 text-sm font-semibold text-red-700'>Không thể tải địa chỉ đã lưu. Bạn vẫn có thể nhập địa chỉ khác.</p> : addresses.data?.length ? <div className='mt-3 grid gap-3'>{addresses.data.map((address) => <label key={address.id} className='flex cursor-pointer gap-3 rounded-xl border bg-white p-4'><input type='radio' name='saved_address' checked={selectedAddressId === address.id} onChange={() => selectAddress(address.id)} /><span><strong>{address.recipient_name} - {address.phone}</strong><span className='muted mt-1 block'>{address.address_line}, {address.ward}, {address.district}, {address.province}</span>{address.is_default && <span className='mt-2 inline-block rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800'>Mặc định</span>}</span></label>)}</div> : <p className='muted mt-3'>Bạn chưa có địa chỉ đã lưu.</p>}<label className='mt-3 flex cursor-pointer gap-3 rounded-xl border bg-white p-4'><input type='radio' name='saved_address' checked={selectedAddressId === 'manual'} onChange={() => selectAddress('manual')} /><strong>Sử dụng địa chỉ khác</strong></label></div>}
      <div className='mt-5 grid gap-4 sm:grid-cols-2'>{fields.map(([name, label, type]) => <label key={name} className={name === 'shipping_address' ? 'sm:col-span-2' : ''}><span className='label'>{label}</span><input className='input' type={type} value={shipping[name]} readOnly={name === 'customer_email' && Boolean(user)} onChange={(event) => updateShipping(name, event.target.value)} required /></label>)}<label className='sm:col-span-2'><span className='label'>Ghi chú</span><textarea className='input min-h-24' name='customer_note' /></label></div>
      <h2 className='mt-8 text-xl font-black'>PHƯƠNG THỨC THANH TOÁN</h2><div className='mt-4 grid gap-3'><label className='rounded-xl border p-4'><input type='radio' name='payment_method' value='cod' defaultChecked /> <strong>Thanh toán khi nhận hàng (COD)</strong></label>{paymentMethods.data?.bank_transfer.enabled && <label className='rounded-xl border p-4'><input type='radio' name='payment_method' value='bank_transfer' /> <strong>Chuyển khoản ngân hàng</strong><span className='muted mt-1 block text-sm'>{paymentMethods.data.bank_transfer.bank_name} · {paymentMethods.data.bank_transfer.account_number}</span></label>}</div>
    </section>
    <aside className='card h-fit p-6'><h2 className='text-xl font-black'>THÔNG TIN ĐƠN HÀNG</h2><div className='mt-4 grid gap-4'>{items.map((item) => <article key={item.id} className='flex gap-3 border-b pb-4'><img src={item.variant.product.images?.[0]?.image_path || '/images/product-placeholder.svg'} alt={item.variant.product.name} className='h-20 w-20 rounded-xl object-cover' /><div className='min-w-0 flex-1'><strong>{item.variant.product.name}</strong>{item.variant.attributes.map((attribute) => <div className='mt-1 text-xs text-slate-500' key={attribute.attribute_id}>{attribute.attribute_name || 'Tùy chọn'}: {attribute.value}{attribute.option_code ? ' (' + attribute.option_code + ')' : ''}</div>)}<div className='mt-2 text-sm'>{formatPrice(item.unit_price)} × {item.quantity}</div></div></article>)}</div><div className='mt-5 flex gap-2'><input className='input' value={coupon} onChange={(event) => setCoupon(event.target.value.toUpperCase())} placeholder='Mã giảm giá' /><button type='button' className='btn-secondary' onClick={() => void preview()}>Áp dụng</button></div><div className='mt-5 grid gap-3 border-t pt-5'><div className='flex justify-between'><span>Tạm tính</span><strong>{formatPrice(summary.subtotal)}</strong></div><div className='flex justify-between'><span>Giảm giá</span><strong>-{formatPrice(summary.discount_amount)}</strong></div><div className='flex justify-between'><span>Phí giao hàng</span><strong>{formatPrice(summary.shipping_fee)}</strong></div><div className='flex justify-between border-t pt-4 text-lg'><strong>Tổng cộng</strong><strong className='price'>{formatPrice(summary.total_amount)}</strong></div></div><button className='btn-primary mt-5 w-full' disabled={submitting}>{submitting ? 'Đang đặt hàng...' : 'THANH TOÁN'}</button></aside>
  </form></div>
}
