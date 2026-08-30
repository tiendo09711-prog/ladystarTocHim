import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from '../../types'
import { ReturnsAdminPage } from './AfterSalesAdminPages'
import { InventoryAdminPage } from './InventoryAdminPage'
import { AdminOrderDetailPage } from './OrdersAdminPage'
import { ProductsAdminPage } from './ProductsAdminPage'
import { SettingsAdminPage } from './SettingsAdminPage'

const state = vi.hoisted(() => ({
  user: { id: 2, name: 'Viewer', email: 'viewer@test.local', role: 'staff', status: 'active', permissions: [] } as User,
}))

const product = { id: 1, name: 'Tóc mẫu', base_sku: 'SKU-1', status: 'active', category: { name: 'Danh mục' }, images: [], variants: [{ id: 1, sku: 'SKU-1-A', current_price: 100000, stock: 3 }] }
const inventory = { id: 1, branch_id: 1, product_variant_id: 1, quantity_on_hand: 3, quantity_reserved: 1, quantity_available: 2, reorder_level: 1, branch: { id: 1, name: 'Chi nhánh' }, variant: { sku: 'SKU-1-A', product: { name: 'Tóc mẫu' } } }
const order = { id: 1, order_number: 'LS-001', total_amount: 100000, subtotal: 100000, discount_amount: 0, shipping_fee: 0, payment_method: 'cod', payment_status: 'unpaid', order_status: 'pending', created_at: '2026-08-28T00:00:00Z', customer_name: 'Khách hàng', customer_phone: '0900000000', shipping_address: 'Hà Nội', admin_note: 'Ghi chú chỉ đọc', items: [], status_histories: [], payment: null, shipment: null }
const returnRequest = { id: 1, code: 'RET-001', request_type: 'return', status: 'requested', requested_at: '2026-08-28T00:00:00Z', order: { id: 1, order_number: 'LS-001', order_status: 'completed' }, customer: { customer_name: 'Khách hàng', customer_phone: '0900000000' }, receiving_branch: null, items: [], media: [], shipments: [], refunds: [] }
const settings = { store_name: 'LadyStars', order_prefix: 'LS', support_phone: null, support_email: null, store_address: null, currency: 'VND', shipping_fee: 0, free_shipping_from: 0, low_stock_threshold: 5, bank_transfer_enabled: false, bank_name: null, bank_account_name: null, bank_account_number: null, bank_branch: null, bank_qr_path: null, bank_transfer_note: null, returns_enabled: true, return_window_days: 7, exchange_enabled: true, exchange_window_days: 7, refund_shipping_on_full_return: false, warranty_enabled: true, appointments_enabled: true, appointment_cancel_before_hours: 24, store_timezone: 'Asia/Ho_Chi_Minh' }

vi.mock('../../stores/AuthContext', () => ({ useAuth: () => ({ user: state.user, loading: false }) }))
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    const key = queryKey[0]
    if (key === 'admin-products') return { isLoading: false, data: { data: [product] } }
    if (key === 'admin-inventory') return { isLoading: false, data: { data: [inventory] } }
    if (key === 'admin-order') return { isLoading: false, data: order }
    if (key === 'admin-returns') return { isLoading: false, data: returnRequest }
    if (key === 'admin-settings') return { isLoading: false, data: settings }
    return { isLoading: false, data: undefined }
  },
}))

function renderRoute(path: string, element: React.ReactNode) {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path={path.replace('/1', '/:id')} element={element} /></Routes></MemoryRouter>)
}

describe('admin action permissions', () => {
  beforeEach(() => { state.user = { ...state.user, permissions: [] } })

  it('ẩn thao tác Products khi Staff chỉ có products.view', () => {
    state.user.permissions = ['products.view']
    renderRoute('/admin/products', <ProductsAdminPage />)
    expect(screen.queryByText('Thêm sản phẩm')).not.toBeInTheDocument()
    expect(screen.getByText('Chỉ xem')).toBeInTheDocument()
  })

  it('ẩn thao tác Inventory khi Staff chỉ có inventory.view', () => {
    state.user.permissions = ['inventory.view']
    renderRoute('/admin/inventory', <InventoryAdminPage />)
    expect(screen.queryByRole('button', { name: 'Điều chỉnh' })).not.toBeInTheDocument()
    expect(screen.getByText('Chỉ xem')).toBeInTheDocument()
  })

  it('ẩn thao tác Orders khi Staff chỉ có orders.view', () => {
    state.user.permissions = ['orders.view']
    renderRoute('/admin/orders/1', <AdminOrderDetailPage />)
    expect(screen.queryByText('Cập nhật trạng thái')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Lưu thanh toán' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Lưu ghi chú' })).not.toBeInTheDocument()
  })

  it('ẩn lifecycle Returns khi Staff chỉ có returns.view', () => {
    state.user.permissions = ['returns.view']
    renderRoute('/admin/returns/1', <ReturnsAdminPage />)
    expect(screen.queryByRole('button', { name: 'Bắt đầu xem xét' })).not.toBeInTheDocument()
  })

  it('giữ Settings ở chế độ chỉ đọc khi thiếu settings.manage', () => {
    state.user.permissions = ['settings.view']
    renderRoute('/admin/settings', <SettingsAdminPage />)
    expect(screen.queryByRole('button', { name: 'Lưu cấu hình' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Upload QR' })).not.toBeInTheDocument()
  })
})
