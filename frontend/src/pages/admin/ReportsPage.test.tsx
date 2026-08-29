import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../api/apiClient'
import { ReportsPage } from './ReportsPage'

vi.mock('../../api/apiClient', () => ({ apiClient: { get: vi.fn() } }))
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null, Legend: () => null, Line: () => null, Tooltip: () => null, XAxis: () => null, YAxis: () => null,
}))

const overview = {
  gross_sales: 1000000, refunds: 100000, net_revenue: 900000, completed_orders: 2, cancelled_orders: 1,
  aov_gross: 500000, aov_net: 450000, gross_profit_estimate: 300000, gross_margin_estimate: 0.3333,
  returned_quantity: 1, return_rate: 0.1, cost_data_quality: { snapshot_items: 1, fallback_items: 1, missing_items: 0 },
  branches: [{ id: 1, name: 'Chi nhánh chính', code: 'MAIN' }],
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter><ReportsPage /></MemoryRouter></QueryClientProvider>)
}

describe('ReportsPage', () => {
  beforeEach(() => vi.mocked(apiClient.get).mockReset())

  it('hiển thị loading và error state', async () => {
    vi.mocked(apiClient.get).mockImplementation(() => new Promise(() => undefined))
    const view = renderPage()
    expect(screen.getByText('Đang tải báo cáo...')).toBeInTheDocument()
    view.unmount()

    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/admin/reports/overview') throw new Error('failed')
      return { data: { data: { data: [] } } }
    })
    renderPage()
    expect(await screen.findByText('Không thể tải báo cáo. Vui lòng thử lại.')).toBeInTheDocument()
  })

  it('render KPI, filters và cảnh báo chất lượng giá vốn', async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/admin/reports/overview') return { data: { data: overview } }
      return { data: { data: { data: [] } } }
    })
    renderPage()
    expect(await screen.findByText('Doanh thu gộp')).toBeInTheDocument()
    expect(screen.getByText(/Một phần dữ liệu giá vốn lịch sử chưa có snapshot/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Chi nhánh'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }))
    await waitFor(() => expect(vi.mocked(apiClient.get)).toHaveBeenCalledWith('/admin/reports/overview', expect.objectContaining({ params: expect.objectContaining({ branch_id: '1' }) })))
  })

  it('hiển thị empty state và phân trang product report', async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url, config) => {
      if (url === '/admin/reports/overview') return { data: { data: { ...overview, cost_data_quality: { snapshot_items: 1, fallback_items: 0, missing_items: 0 } } } }
      if (url === '/admin/reports/sales') return { data: { data: { data: [] } } }
      if (url === '/admin/reports/products') {
        const page = Number((config as { params?: { page?: number } } | undefined)?.params?.page ?? 1)
        return { data: { data: { cost_data_quality: { snapshot_items: 1, fallback_items: 0, missing_items: 0 }, rows: { current_page: page, last_page: 2, per_page: 20, total: 2, data: page === 1 ? [{ product_id: 1, product_name: 'Tóc mẫu', quantity_sold: 2, gross_revenue: 1000000, completed_return_quantity: 0, return_rate: 0, estimated_profit: 300000, estimated_margin: 0.3, last_sold_at: '2026-08-20' }] : [] } } } }
      }
      return { data: { data: { data: [] } } }
    })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Sản phẩm' }))
    expect(await screen.findByText('Tóc mẫu')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Sau' }))
    expect(await screen.findByText('Chưa có dữ liệu sản phẩm')).toBeInTheDocument()
  })
})
