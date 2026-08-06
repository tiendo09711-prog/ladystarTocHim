import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingState } from '../../components/common/LoadingState'
import { ProductCard } from '../../components/products/ProductCard'
import { useAuth } from '../../stores/AuthContext'
import type { ApiResponse, Order, Pagination, Product } from '../../types'
import { formatPrice, statusLabel } from '../../utils/format'

interface Address { id: number; recipient_name: string; phone: string; province: string; district: string; ward: string; address_line: string; is_default: boolean }

export function AccountIndexPage() { return <Navigate to="/tai-khoan/ho-so" replace /> }

export function ProfilePage() {
  const { user, refresh, logout } = useAuth()
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget).entries()); try { await apiClient.put('/account/profile', data); await refresh(); toast.success('Cập nhật hồ sơ thành công.') } catch { toast.error('Không thể cập nhật hồ sơ.') } }
  return <div className="card p-6"><h1 className="text-2xl font-black">Hồ sơ cá nhân</h1><form className="mt-6 grid max-w-xl gap-4" onSubmit={submit}><label><span className="label">Họ và tên</span><input className="input" name="name" defaultValue={user?.name} required /></label><label><span className="label">Email</span><input className="input bg-slate-100" value={user?.email ?? ''} disabled /></label><label><span className="label">Số điện thoại</span><input className="input" name="phone" defaultValue={user?.phone ?? ''} /></label><div className="flex flex-wrap gap-3"><button className="btn-primary">Lưu thay đổi</button><button type="button" className="btn-secondary" onClick={logout}>Đăng xuất</button></div></form></div>
}

export function AddressesPage() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['addresses'], queryFn: async () => (await apiClient.get<ApiResponse<Address[]>>('/account/addresses')).data.data })
  const [open, setOpen] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); try { await apiClient.post('/account/addresses', Object.fromEntries(new FormData(event.currentTarget).entries())); await client.invalidateQueries({ queryKey: ['addresses'] }); setOpen(false); toast.success('Đã thêm địa chỉ.') } catch { toast.error('Thông tin địa chỉ chưa hợp lệ.') } }
  return <div className="card p-6"><div className="flex items-center justify-between"><h1 className="text-2xl font-black">Địa chỉ nhận hàng</h1><button className="btn-primary" onClick={() => setOpen(!open)}>Thêm địa chỉ</button></div>{open && <form className="mt-6 grid gap-3 rounded-2xl bg-slate-50 p-5 sm:grid-cols-2" onSubmit={submit}>{[['recipient_name', 'Người nhận'], ['phone', 'Số điện thoại'], ['province', 'Tỉnh / thành'], ['district', 'Quận / huyện'], ['ward', 'Phường / xã'], ['address_line', 'Địa chỉ cụ thể']].map(([name, label]) => <label key={name}><span className="label">{label}</span><input className="input" name={name} required /></label>)}<label className="flex items-center gap-2"><input type="checkbox" name="is_default" value="1" /> Đặt làm mặc định</label><button className="btn-primary sm:col-span-2">Lưu địa chỉ</button></form>}{query.isLoading ? <div className="mt-6"><LoadingState /></div> : <div className="mt-6 grid gap-4">{query.data?.map((address) => <div key={address.id} className="rounded-2xl border p-5"><div className="flex flex-wrap items-center gap-2"><strong>{address.recipient_name}</strong><span>{address.phone}</span>{address.is_default && <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800">Mặc định</span>}</div><p className="muted mt-2">{address.address_line}, {address.ward}, {address.district}, {address.province}</p></div>)}</div>}</div>
}

export function OrdersPage() {
  const query = useQuery({ queryKey: ['orders'], queryFn: async () => (await apiClient.get<ApiResponse<Pagination<Order>>>('/account/orders')).data.data })
  if (query.isLoading) return <LoadingState />
  return <div className="card p-6"><h1 className="text-2xl font-black">Lịch sử đơn hàng</h1>{query.data?.data.length ? <div className="mt-6 table-wrap"><table className="table"><thead><tr><th>Mã đơn</th><th>Ngày đặt</th><th>Tổng tiền</th><th>Thanh toán</th><th>Trạng thái</th><th></th></tr></thead><tbody>{query.data.data.map((order) => <tr key={order.id}><td className="font-bold">{order.order_number}</td><td>{new Date(order.created_at).toLocaleDateString('vi-VN')}</td><td className="price">{formatPrice(order.total_amount)}</td><td>{statusLabel[order.payment_status]}</td><td><span className="rounded-full bg-slate-100 px-2 py-1 text-sm font-bold">{statusLabel[order.order_status]}</span></td><td><Link className="font-bold text-emerald-800" to={`/tai-khoan/don-hang/${order.order_number}`}>Chi tiết</Link></td></tr>)}</tbody></table></div> : <div className="mt-6"><EmptyState title="Chưa có đơn hàng" description="Đơn hàng sau khi đặt sẽ xuất hiện tại đây." /></div>}</div>
}

export function OrderDetailPage() {
  const { orderNumber = '' } = useParams()
  const query = useQuery({ queryKey: ['order', orderNumber], queryFn: async () => (await apiClient.get<ApiResponse<Order>>(`/account/orders/${orderNumber}`)).data.data })
  const client = useQueryClient()
  if (query.isLoading || !query.data) return <LoadingState />
  const order = query.data
  const cancel = async () => { try { await apiClient.post(`/account/orders/${orderNumber}/cancel`); await client.invalidateQueries({ queryKey: ['order', orderNumber] }); toast.success('Đã hủy đơn hàng.') } catch (error) { toast.error(axios.isAxiosError(error) ? error.response?.data?.message ?? 'Không thể hủy đơn.' : 'Không thể hủy đơn.') } }
  return <div className="card p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="muted">Mã đơn</div><h1 className="text-2xl font-black">{order.order_number}</h1></div><span className="rounded-full bg-emerald-50 px-3 py-2 font-bold text-emerald-800">{statusLabel[order.order_status]}</span></div><div className="mt-6 grid gap-5 md:grid-cols-2"><div className="rounded-2xl bg-slate-50 p-5"><h2 className="font-black">Người nhận</h2><p className="mt-2">{order.customer_name} · {order.customer_phone}</p><p className="muted mt-1">{order.shipping_address}</p></div><div className="rounded-2xl bg-slate-50 p-5"><h2 className="font-black">Thanh toán</h2><p className="mt-2">{order.payment_method === 'cod' ? 'Thanh toán khi nhận hàng' : 'Chuyển khoản'}</p><p className="muted mt-1">{statusLabel[order.payment_status]}</p></div></div><div className="mt-6 table-wrap"><table className="table"><thead><tr><th>Sản phẩm</th><th>SKU</th><th>Số lượng</th><th>Thành tiền</th></tr></thead><tbody>{order.items.map((item) => <tr key={item.id}><td>{item.product_name}</td><td>{item.sku}</td><td>{item.quantity}</td><td>{formatPrice(item.line_total)}</td></tr>)}</tbody></table></div><div className="mt-6 ml-auto max-w-sm space-y-2"><div className="flex justify-between"><span>Tạm tính</span><strong>{formatPrice(order.subtotal)}</strong></div><div className="flex justify-between"><span>Giảm giá</span><strong>-{formatPrice(order.discount_amount)}</strong></div><div className="flex justify-between"><span>Phí giao hàng</span><strong>{formatPrice(order.shipping_fee)}</strong></div><div className="flex justify-between border-t pt-3 text-lg"><strong>Tổng cộng</strong><strong className="price">{formatPrice(order.total_amount)}</strong></div></div>{order.order_status === 'pending' && <button className="btn-secondary mt-6 border-red-200 text-red-700" onClick={cancel}>Hủy đơn hàng</button>}</div>
}

export function WishlistPage() {
  const query = useQuery({ queryKey: ['wishlist'], queryFn: async () => (await apiClient.get<ApiResponse<Product[]>>('/account/wishlist')).data.data })
  return <div><h1 className="mb-6 text-2xl font-black">Sản phẩm yêu thích</h1>{query.isLoading ? <LoadingState /> : query.data?.length ? <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">{query.data.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <EmptyState title="Chưa có sản phẩm yêu thích" description="Lưu sản phẩm để dễ xem lại sau." />}</div>
}
