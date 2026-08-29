import { useQuery } from '@tanstack/react-query'
import { BarChart3, Boxes, Package, RefreshCcw, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { apiClient } from '../../api/apiClient'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingState } from '../../components/common/LoadingState'
import type { ApiResponse, Pagination } from '../../types'
import { formatPrice } from '../../utils/format'

type Tab = 'overview' | 'sales' | 'products' | 'inventory' | 'customers'
interface BranchOption { id: number; name: string; code: string }
interface CostQuality { snapshot_items: number; fallback_items: number; missing_items: number }
interface Overview {
  gross_sales: number; refunds: number; net_revenue: number; completed_orders: number; cancelled_orders: number
  aov_gross: number; aov_net: number; gross_profit_estimate: number; gross_margin_estimate: number
  returned_quantity: number; return_rate: number; cost_data_quality: CostQuality; branches: BranchOption[]
}
interface SalesRow { date: string; gross_sales: number; refunds: number; net_revenue: number; completed_orders: number }
interface ProductRow { product_id: number; product_name: string; quantity_sold: number; gross_revenue: number; completed_return_quantity: number; return_rate: number; estimated_profit: number; estimated_margin: number; last_sold_at?: string | null }
interface InventoryRow { id: number; sku: string; product_name: string; branch_name: string; quantity_on_hand: number; quantity_reserved: number; quantity_available: number; inventory_value?: number | null; sold_30d: number; last_sold_at?: string | null; is_dead_stock: boolean }
interface InventorySummary { inventory_value: number; unknown_cost_items: number; low_stock_items: number; out_of_stock_items: number; dead_stock_items: number; dead_stock_days: number }
interface CustomerRow { id: number; name: string; email: string; completed_orders: number; gross_spend: number; completed_refunds: number; net_spend: number; aov_net: number; last_purchase_at?: string | null }

const isoDate = (date: Date) => date.toISOString().slice(0, 10)
const today = () => new Date()
const daysAgo = (days: number) => { const date = today(); date.setDate(date.getDate() - days); return date }
const initialFilters = { date_from: isoDate(daysAgo(29)), date_to: isoDate(today()), branch_id: '' }
const tabs: Array<[Tab, string]> = [['overview', 'Tổng quan'], ['sales', 'Bán hàng'], ['products', 'Sản phẩm'], ['inventory', 'Tồn kho'], ['customers', 'Khách hàng']]

export function ReportsPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [draft, setDraft] = useState(initialFilters)
  const [filters, setFilters] = useState(initialFilters)
  const [page, setPage] = useState(1)
  const params = useMemo(() => ({ date_from: filters.date_from, date_to: filters.date_to, branch_id: filters.branch_id || undefined, page }), [filters, page])
  const overview = useQuery({ queryKey: ['reports-overview', filters], queryFn: async () => (await apiClient.get<ApiResponse<Overview>>('/admin/reports/overview', { params })).data.data })
  const sales = useQuery({ queryKey: ['reports-sales', filters], queryFn: async () => (await apiClient.get<ApiResponse<{ data: SalesRow[] }>>('/admin/reports/sales', { params })).data.data.data })
  const products = useQuery({ queryKey: ['reports-products', filters, page], enabled: tab === 'products', queryFn: async () => (await apiClient.get<ApiResponse<{ rows: Pagination<ProductRow>; cost_data_quality: CostQuality }>>('/admin/reports/products', { params })).data.data })
  const inventory = useQuery({ queryKey: ['reports-inventory', filters, page], enabled: tab === 'inventory', queryFn: async () => (await apiClient.get<ApiResponse<{ summary: InventorySummary; rows: Pagination<InventoryRow> }>>('/admin/reports/inventory', { params })).data.data })
  const customers = useQuery({ queryKey: ['reports-customers', filters, page], enabled: tab === 'customers', queryFn: async () => (await apiClient.get<ApiResponse<Pagination<CustomerRow>>>('/admin/reports/customers', { params })).data.data })
  const activeQuery = tab === 'products' ? products : tab === 'inventory' ? inventory : tab === 'customers' ? customers : tab === 'sales' ? sales : overview
  const quality = products.data?.cost_data_quality ?? overview.data?.cost_data_quality

  const applyPreset = (days: number | 'month') => {
    const end = today()
    const start = days === 'month' ? new Date(end.getFullYear(), end.getMonth(), 1) : daysAgo(days - 1)
    const next = { ...draft, date_from: isoDate(start), date_to: isoDate(end) }
    setDraft(next); setFilters(next); setPage(1)
  }

  if (overview.isLoading) return <LoadingState label="Đang tải báo cáo..." />
  return <div>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-black">Báo cáo & phân tích</h1><p className="muted mt-1">Doanh thu, lợi nhuận ước tính, sản phẩm, tồn kho và khách hàng.</p></div><button className="btn-secondary" onClick={() => { void overview.refetch(); void sales.refetch() }}><RefreshCcw size={17} />Làm mới</button></div>
    <form className="card mb-5 grid gap-4 p-4 md:grid-cols-4" onSubmit={(event) => { event.preventDefault(); setFilters(draft); setPage(1) }}>
      <label><span className="label">Từ ngày</span><input className="input" type="date" value={draft.date_from} onChange={(event) => setDraft({ ...draft, date_from: event.target.value })} /></label>
      <label><span className="label">Đến ngày</span><input className="input" type="date" value={draft.date_to} onChange={(event) => setDraft({ ...draft, date_to: event.target.value })} /></label>
      <label><span className="label">Chi nhánh</span><select className="input" value={draft.branch_id} onChange={(event) => setDraft({ ...draft, branch_id: event.target.value })}><option value="">Tất cả chi nhánh</option>{overview.data?.branches.map((branch) => <option value={branch.id} key={branch.id}>{branch.name}</option>)}</select></label>
      <div className="flex items-end gap-2"><button className="btn-primary flex-1">Áp dụng</button></div>
      <div className="flex flex-wrap gap-2 md:col-span-4"><button type="button" className="btn-secondary" onClick={() => applyPreset(7)}>7 ngày</button><button type="button" className="btn-secondary" onClick={() => applyPreset(30)}>30 ngày</button><button type="button" className="btn-secondary" onClick={() => applyPreset('month')}>Tháng này</button></div>
    </form>
    <div className="mb-5 flex gap-2 overflow-x-auto pb-1">{tabs.map(([value, label]) => <button type="button" key={value} className={tab === value ? 'btn-primary whitespace-nowrap' : 'btn-secondary whitespace-nowrap'} onClick={() => { setTab(value); setPage(1) }}>{label}</button>)}</div>
    {quality && (quality.fallback_items > 0 || quality.missing_items > 0) && <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><strong>Lưu ý chất lượng giá vốn:</strong> Một phần dữ liệu giá vốn lịch sử chưa có snapshot; lợi nhuận được tính ước tính theo giá vốn hiện tại. Thiếu giá vốn: {quality.missing_items} dòng.</div>}
    {activeQuery.isError ? <div className="card border-red-200 p-8 text-center text-red-700">Không thể tải báo cáo. Vui lòng thử lại.</div> : activeQuery.isLoading ? <LoadingState /> : <ReportContent tab={tab} overview={overview.data} sales={sales.data ?? []} products={products.data?.rows} inventory={inventory.data} customers={customers.data} page={page} setPage={setPage} />}
  </div>
}

function ReportContent({ tab, overview, sales, products, inventory, customers, page, setPage }: { tab: Tab; overview?: Overview; sales: SalesRow[]; products?: Pagination<ProductRow>; inventory?: { summary: InventorySummary; rows: Pagination<InventoryRow> }; customers?: Pagination<CustomerRow>; page: number; setPage: (page: number) => void }) {
  if ((tab === 'overview' || tab === 'sales') && !overview) return <EmptyState title="Chưa có dữ liệu" description="Không có KPI trong khoảng thời gian đã chọn." />
  if (tab === 'overview') {
    const cards = [[overview!.gross_sales, 'Doanh thu gộp', BarChart3], [overview!.refunds, 'Hoàn tiền', RefreshCcw], [overview!.net_revenue, 'Doanh thu thuần', BarChart3], [overview!.completed_orders, 'Đơn hoàn thành', Package], [overview!.aov_net, 'AOV thuần', Users], [overview!.gross_profit_estimate, 'Lợi nhuận gộp ước tính', Boxes]] as const
    return <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([value, label, Icon]) => <div className="card flex items-center gap-4 p-5" key={label}><div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><Icon size={20} /></div><div><div className="text-2xl font-black">{label === 'Đơn hoàn thành' ? value : formatPrice(value)}</div><div className="muted text-sm">{label}</div></div></div>)}</div><SalesChart rows={sales} /></>
  }
  if (tab === 'sales') return sales.length ? <><SalesChart rows={sales} /><div className="table-wrap mt-5"><table className="table"><thead><tr><th>Ngày</th><th>Doanh thu gộp</th><th>Hoàn tiền</th><th>Doanh thu thuần</th><th>Đơn</th></tr></thead><tbody>{sales.map((row) => <tr key={row.date}><td>{new Date(`${row.date}T00:00:00`).toLocaleDateString('vi-VN')}</td><td>{formatPrice(row.gross_sales)}</td><td>{formatPrice(row.refunds)}</td><td><strong>{formatPrice(row.net_revenue)}</strong></td><td>{row.completed_orders}</td></tr>)}</tbody></table></div></> : <EmptyState title="Chưa có doanh số" description="Không có đơn hoàn thành trong kỳ." />
  if (tab === 'products') return products?.data.length ? <><div className="table-wrap"><table className="table"><thead><tr><th>Sản phẩm</th><th>Đã bán</th><th>Doanh thu</th><th>Đã trả</th><th>Tỷ lệ trả</th><th>Lợi nhuận ước tính</th><th>Biên</th><th>Bán gần nhất</th></tr></thead><tbody>{products.data.map((row) => <tr key={row.product_id}><td><strong>{row.product_name}</strong></td><td>{row.quantity_sold}</td><td>{formatPrice(row.gross_revenue)}</td><td>{row.completed_return_quantity}</td><td>{(row.return_rate * 100).toFixed(1)}%</td><td>{formatPrice(row.estimated_profit)}</td><td>{(row.estimated_margin * 100).toFixed(1)}%</td><td>{formatDate(row.last_sold_at)}</td></tr>)}</tbody></table></div><Pager page={page} lastPage={products.last_page} setPage={setPage} /></> : <EmptyState title="Chưa có dữ liệu sản phẩm" description="Không có sản phẩm bán trong kỳ." />
  if (tab === 'inventory') return inventory?.rows.data.length ? <><div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Giá trị tồn kho" value={formatPrice(inventory.summary.inventory_value)} /><Metric label="Low Stock" value={inventory.summary.low_stock_items} /><Metric label="Out of Stock" value={inventory.summary.out_of_stock_items} /><Metric label={`Dead Stock (${inventory.summary.dead_stock_days} ngày)`} value={inventory.summary.dead_stock_items} /></div><div className="table-wrap"><table className="table"><thead><tr><th>SKU</th><th>Sản phẩm</th><th>Chi nhánh</th><th>On hand</th><th>Reserved</th><th>Available</th><th>Giá trị</th><th>Đã bán 30d</th><th>Bán gần nhất</th></tr></thead><tbody>{inventory.rows.data.map((row) => <tr key={row.id}><td><strong>{row.sku}</strong></td><td>{row.product_name}{row.is_dead_stock && <div className="text-xs font-bold text-amber-700">Dead stock</div>}</td><td>{row.branch_name}</td><td>{row.quantity_on_hand}</td><td>{row.quantity_reserved}</td><td>{row.quantity_available}</td><td>{row.inventory_value == null ? 'Chưa có giá vốn' : formatPrice(row.inventory_value)}</td><td>{row.sold_30d}</td><td>{formatDate(row.last_sold_at)}</td></tr>)}</tbody></table></div><Pager page={page} lastPage={inventory.rows.last_page} setPage={setPage} /></> : <EmptyState title="Chưa có dữ liệu tồn kho" description="Không có tồn kho phù hợp bộ lọc." />
  return customers?.data.length ? <><div className="table-wrap"><table className="table"><thead><tr><th>Khách hàng</th><th>Đơn hoàn thành</th><th>Chi tiêu gộp</th><th>Hoàn tiền</th><th>Chi tiêu thuần</th><th>AOV</th><th>Mua gần nhất</th></tr></thead><tbody>{customers.data.map((row) => <tr key={row.id}><td><strong>{row.name}</strong><div className="text-sm text-slate-500">{row.email}</div></td><td>{row.completed_orders}</td><td>{formatPrice(row.gross_spend)}</td><td>{formatPrice(row.completed_refunds)}</td><td><strong>{formatPrice(row.net_spend)}</strong></td><td>{formatPrice(row.aov_net)}</td><td>{formatDate(row.last_purchase_at)}</td></tr>)}</tbody></table></div><Pager page={page} lastPage={customers.last_page} setPage={setPage} /></> : <EmptyState title="Chưa có dữ liệu khách hàng" description="Không tìm thấy khách hàng phù hợp." />
}

function SalesChart({ rows }: { rows: SalesRow[] }) {
  return <section className="card mt-5 p-5"><h2 className="text-lg font-black">Doanh thu theo ngày</h2><div className="mt-4 h-80"><ResponsiveContainer width="100%" height="100%"><LineChart data={rows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(value: number) => `${Math.round(value / 1000000)}tr`} /><Tooltip formatter={(value) => formatPrice(Number(value))} /><Legend /><Line type="monotone" dataKey="gross_sales" name="Gross Sales" stroke="#4f8b6b" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="refunds" name="Refund" stroke="#b85042" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="net_revenue" name="Net Revenue" stroke="#245c43" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></div></section>
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div className="card p-5"><div className="text-2xl font-black">{value}</div><div className="muted text-sm">{label}</div></div> }
function Pager({ page, lastPage, setPage }: { page: number; lastPage: number; setPage: (page: number) => void }) { return <div className="mt-4 flex items-center justify-end gap-2"><button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</button><span className="text-sm">Trang {page}/{lastPage}</span><button className="btn-secondary" disabled={page >= lastPage} onClick={() => setPage(page + 1)}>Sau</button></div> }
function formatDate(value?: string | null) { return value ? new Date(value).toLocaleDateString('vi-VN') : '—' }
