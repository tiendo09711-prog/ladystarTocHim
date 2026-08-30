import { expect, test, type Page } from '@playwright/test'

const histories = [
  { id: 1, from_status: null, to_status: 'pending', changed_by: null, note: 'Đơn hàng được tạo.', created_at: '2026-08-28T08:00:00Z' },
  { id: 2, from_status: 'pending', to_status: 'confirmed', changed_by: 1, note: null, created_at: '2026-08-28T08:10:00Z' },
  { id: 3, from_status: 'confirmed', to_status: 'processing', changed_by: 1, note: null, created_at: '2026-08-28T08:20:00Z' },
]
const order = { id: 7, order_number: 'LS260828ABC123', total_amount: 1530000, subtotal: 1500000, discount_amount: 0, shipping_fee: 30000, payment_method: 'bank_transfer', payment_status: 'unpaid', order_status: 'processing', created_at: '2026-08-28T08:00:00Z', customer_name: 'Khách Phase 2', customer_phone: '0900000000', province: 'Hà Nội', district: 'Ba Đình', ward: 'Điện Biên', shipping_address: '10 Trần Phú', admin_note: null, items: [{ id: 1, product_name: 'Tóc giả Phase 2', sku: 'P2-01', unit_price: 1500000, quantity: 1, line_total: 1500000 }], status_histories: histories, payment: { method: 'bank_transfer', provider: 'manual', amount: 1530000, status: 'pending', transaction_code: null, paid_at: null }, shipment: null }
const methods = { cod: { enabled: true }, bank_transfer: { enabled: true, bank_name: 'Vietcombank', account_name: 'LADYSTARS', account_number: '123456789', bank_branch: 'Hà Nội', qr_path: '/images/product-placeholder.svg', instruction: 'Ghi mã đơn trong nội dung chuyển khoản.' } }

async function mockStore(page: Page, loggedIn = false) {
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ status: loggedIn ? 200 : 401, json: loggedIn ? { success: true, data: { id: 2, name: 'Khách Phase 2', email: 'customer@example.com', phone: '0900000000', role: 'user', status: 'active' } } : { message: 'Unauthenticated.' } }))
  await page.route('**/api/v1/cart', (route) => route.fulfill({ json: { success: true, data: { items: [], subtotal: 0, count: 0 } } }))
  await page.route('**/api/v1/payment-methods', (route) => route.fulfill({ json: { success: true, data: methods } }))
}

test('guest tracks timeline payment and shipment on mobile', async ({ page }) => {
  await mockStore(page)
  await page.route('**/api/v1/orders/track', (route) => route.fulfill({ json: { success: true, data: { ...order, shipment: { carrier: 'GHN', tracking_number: 'TRACK-001', shipping_fee_actual: 35000, status: 'shipped', shipped_at: '2026-08-28T09:00:00Z', delivered_at: null, tracking_url: 'https://example.com/track' } } } }))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/tra-cuu-don-hang?order=LS260828ABC123')
  await page.getByLabel('Số điện thoại').fill('0900000000')
  await page.getByRole('button', { name: 'Tra cứu đơn hàng' }).click()
  await expect(page.getByRole('heading', { name: 'LS260828ABC123' })).toBeVisible()
  await expect(page.getByText('Đơn hàng được tạo.')).toBeVisible()
  await expect(page.getByText('TRACK-001')).toBeVisible()
})

test('bank transfer success shows manual bank instructions', async ({ page }) => {
  await mockStore(page)
  await page.goto('/dat-hang-thanh-cong/LS260828ABC123?payment_method=bank_transfer')
  await expect(page.getByRole('heading', { name: 'Thông tin chuyển khoản' })).toBeVisible()
  await expect(page.getByText('Vietcombank')).toBeVisible()
  await expect(page.getByText('123456789')).toBeVisible()
  await expect(page.getByText('LS260828ABC123', { exact: true })).toBeVisible()
  await expect(page.getByAltText('QR chuyển khoản ngân hàng')).toBeVisible()
})

test('admin confirms payment and completes manual shipment', async ({ page }) => {
  let current = structuredClone(order)
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: { success: true, data: { id: 1, name: 'Admin', email: 'admin@example.com', role: 'admin', status: 'active' } } }))
  await page.route('**/api/v1/cart', (route) => route.fulfill({ json: { success: true, data: { items: [], subtotal: 0, count: 0 } } }))
  await page.route('**/api/v1/admin/orders/7', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { success: true, data: current } })
    return route.fallback()
  })
  await page.route('**/api/v1/admin/orders/7/payment-status', async (route) => { current = { ...current, payment_status: 'paid', payment: { ...current.payment, status: 'paid', transaction_code: route.request().postDataJSON().transaction_code, paid_at: '2026-08-28T10:00:00Z' } }; await route.fulfill({ json: { success: true, data: current } }) })
  await page.route('**/api/v1/admin/orders/7/shipment', async (route) => { const payload = route.request().postDataJSON(); current = { ...current, shipment: { ...payload, status: 'pending', shipped_at: null, delivered_at: null } }; await route.fulfill({ json: { success: true, data: current } }) })
  await page.route('**/api/v1/admin/orders/7/shipment/status', async (route) => { const status = route.request().postDataJSON().status; current = { ...current, order_status: status === 'shipped' ? 'shipping' : 'completed', shipment: { ...current.shipment!, status, shipped_at: '2026-08-28T10:10:00Z', delivered_at: status === 'delivered' ? '2026-08-28T11:00:00Z' : null } }; await route.fulfill({ json: { success: true, data: current } }) })
  await page.goto('/admin/orders/7')
  await page.getByLabel('Mã giao dịch (không bắt buộc)').fill('BANK-001')
  await page.getByLabel('Trạng thái thanh toán').selectOption('paid')
  await page.getByRole('button', { name: 'Lưu thanh toán' }).click()
  await expect(page.getByText('Ngày thanh toán:')).toBeVisible()
  await page.getByLabel('Đơn vị vận chuyển').fill('GHN')
  await page.getByLabel('Mã vận đơn').fill('TRACK-001')
  await page.getByRole('button', { name: 'Lưu thông tin vận chuyển' }).click()
  await page.getByRole('button', { name: 'Bàn giao đơn vị vận chuyển' }).click()
  await page.getByRole('button', { name: 'Đánh dấu giao thành công' }).click()
  await expect(page.getByText('Hoàn thành', { exact: true })).toBeVisible()
})

test('customer order detail shows timeline and tracking', async ({ page }) => {
  await mockStore(page, true)
  await page.route('**/api/v1/account/orders/LS260828ABC123', (route) => route.fulfill({ json: { success: true, data: { ...order, shipment: { carrier: 'GHN', tracking_number: 'TRACK-001', status: 'shipped', shipped_at: '2026-08-28T09:00:00Z' } } } }))
  await page.goto('/tai-khoan/don-hang/LS260828ABC123')
  await expect(page.getByRole('heading', { name: 'Lịch sử đơn hàng' })).toBeVisible()
  await expect(page.getByText('TRACK-001')).toBeVisible()
  await expect(page.getByText('Số tiền:')).toBeVisible()
})
