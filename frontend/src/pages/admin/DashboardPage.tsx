import { useQuery } from '@tanstack/react-query'
import { BarChart3, Package, ShoppingBag, Users } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { apiClient } from '../../api/apiClient'
import { LoadingState } from '../../components/common/LoadingState'
import type { ApiResponse } from '../../types'
import { formatPrice, statusLabel } from '../../utils/format'

interface Summary { revenue: number; orders: number; customers: number; products: number; average_order_value: number }
interface RevenuePoint { date: string; revenue: number; orders: number }
interface StatusPoint { order_status: string; total: number }
interface TopProduct { product_name: string; quantity: number; revenue: number }

export function DashboardPage() {
  const summary = useQuery({ queryKey: ['admin-summary'], queryFn: async () => (await apiClient.get<ApiResponse<Summary>>('/admin/dashboard/summary')).data.data })
  const revenue = useQuery({ queryKey: ['admin-revenue'], queryFn: async () => (await apiClient.get<ApiResponse<RevenuePoint[]>>('/admin/dashboard/revenue?days=30')).data.data })
  const statuses = useQuery({ queryKey: ['admin-statuses'], queryFn: async () => (await apiClient.get<ApiResponse<StatusPoint[]>>('/admin/dashboard/order-statuses')).data.data })
  const top = useQuery({ queryKey: ['admin-top'], queryFn: async () => (await apiClient.get<ApiResponse<TopProduct[]>>('/admin/dashboard/top-products')).data.data })
  if (summary.isLoading) return <LoadingState />
  const cards = [[formatPrice(summary.data?.revenue ?? 0), 'Doanh thu', BarChart3], [summary.data?.orders ?? 0, 'Đơn hàng', ShoppingBag], [summary.data?.customers ?? 0, 'Khách hàng', Users], [summary.data?.products ?? 0, 'Sản phẩm', Package]] as const
  return <div><div className="mb-6"><h1 className="text-3xl font-black">Dashboard</h1><p className="muted mt-1">Tổng quan hoạt động kinh doanh từ dữ liệu thật.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([value, label, Icon]) => <div key={label} className="card flex items-center gap-4 p-5"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><Icon /></div><div><div className="text-2xl font-black">{value}</div><div className="muted text-sm">{label}</div></div></div>)}</div>
    <div className="mt-6 grid gap-6 xl:grid-cols-3"><section className="card p-5 xl:col-span-2"><h2 className="text-lg font-black">Doanh thu 30 ngày</h2><div className="mt-5 h-80"><ResponsiveContainer width="100%" height="100%"><LineChart data={revenue.data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 12 }} /><YAxis tickFormatter={(value: number) => `${Math.round(value / 1000000)}tr`} /><Tooltip formatter={(value) => formatPrice(Number(value))} /><Line type="monotone" dataKey="revenue" stroke="#245c43" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></div></section>
      <section className="card p-5"><h2 className="text-lg font-black">Trạng thái đơn</h2><div className="mt-5 h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statuses.data} dataKey="total" nameKey="order_status" innerRadius={55} outerRadius={85}>{statuses.data?.map((entry, index) => <Cell key={entry.order_status} fill={['#245c43', '#4f8b6b', '#e6a23c', '#5b7c99', '#7b5b9e', '#b85042'][index % 6]} />)}</Pie><Tooltip formatter={(value, name) => [value, statusLabel[String(name)] ?? name]} /></PieChart></ResponsiveContainer></div><div className="grid gap-2 text-sm">{statuses.data?.map((item) => <div key={item.order_status} className="flex justify-between"><span>{statusLabel[item.order_status]}</span><strong>{item.total}</strong></div>)}</div></section>
    </div><section className="card mt-6 p-5"><h2 className="text-lg font-black">Sản phẩm bán chạy</h2><div className="mt-5 h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={top.data} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="product_name" width={150} tick={{ fontSize: 12 }} /><Tooltip /><Bar dataKey="quantity" fill="#4f8b6b" radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer></div></section>
  </div>
}
