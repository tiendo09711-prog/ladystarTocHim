import { useQuery } from '@tanstack/react-query'
import { type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingState } from '../../components/common/LoadingState'
import { useAuth } from '../../stores/AuthContext'
import type { ApiResponse, Order, Pagination } from '../../types'
import { statusLabel, useFormatPrice } from '../../utils/format'

export function AccountIndexPage() {
  return <Navigate to='/tai-khoan/ho-so' replace />
}

export function ProfilePage() {
  const { user, refresh, logout } = useAuth()
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try { await apiClient.put('/account/profile', Object.fromEntries(new FormData(event.currentTarget).entries())); await refresh(); toast.success('Cập nhật hồ sơ thành công.') }
    catch { toast.error('Không thể cập nhật hồ sơ.') }
  }
  return <div className='card p-6'><h1 className='text-2xl font-black'>Hồ sơ cá nhân</h1><form className='mt-6 grid max-w-xl gap-4' onSubmit={submit}><label><span className='label'>Họ và tên</span><input className='input' name='name' defaultValue={user?.name} required /></label><label><span className='label'>Email</span><input className='input bg-slate-100' value={user?.email ?? ''} disabled /></label><label><span className='label'>Số điện thoại</span><input className='input' name='phone' defaultValue={user?.phone ?? ''} /></label><div className='flex flex-wrap gap-3'><button className='btn-primary'>Lưu thay đổi</button><button type='button' className='btn-secondary' onClick={() => void logout()}>Đăng xuất</button></div></form></div>
}

export function OrdersPage() {
  const formatPrice = useFormatPrice()
  const query = useQuery({ queryKey: ['orders'], queryFn: async () => (await apiClient.get<ApiResponse<Pagination<Order>>>('/account/orders')).data.data })
  if (query.isLoading) return <LoadingState />
  return <div className='card p-6'><h1 className='text-2xl font-black'>Lịch sử đơn hàng</h1>{query.data?.data.length ? <div className='mt-6 table-wrap'><table className='table'><thead><tr><th>Mã đơn</th><th>Ngày đặt</th><th>Tổng tiền</th><th>Thanh toán</th><th>Trạng thái</th><th></th></tr></thead><tbody>{query.data.data.map((order) => <tr key={order.id}><td className='font-bold'>{order.order_number}</td><td>{new Date(order.created_at).toLocaleDateString('vi-VN')}</td><td className='price'>{formatPrice(order.total_amount)}</td><td>{statusLabel[order.payment_status]}</td><td><span className='rounded-full bg-slate-100 px-2 py-1 text-sm font-bold'>{statusLabel[order.order_status]}</span></td><td><Link className='font-bold text-emerald-800' to={`/tai-khoan/don-hang/${order.order_number}`}>Chi tiết</Link></td></tr>)}</tbody></table></div> : <div className='mt-6'><EmptyState title='Chưa có đơn hàng' description='Đơn hàng sau khi đặt sẽ xuất hiện tại đây.' /></div>}</div>
}
