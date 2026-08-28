import { expect, test, type Page } from '@playwright/test'

const customer = { id: 2, name: 'Khách hàng Phase 1', email: 'customer@example.com', phone: '0900000002', role: 'user', status: 'active' }
const admin = { id: 1, name: 'Quản trị', email: 'admin@example.com', phone: '0900000001', role: 'admin', status: 'active' }
const addresses = [
  { id: 1, recipient_name: 'Người nhận A', phone: '0901000001', province: 'Hà Nội', district: 'Ba Đình', ward: 'Điện Biên', address_line: '10 Trần Phú', postal_code: null, is_default: true },
  { id: 2, recipient_name: 'Người nhận B', phone: '0901000002', province: 'Đà Nẵng', district: 'Hải Châu', ward: 'Thạch Thang', address_line: '20 Bạch Đằng', postal_code: null, is_default: false },
]

async function mockCustomerBase(page: Page) {
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: { success: true, data: customer } }))
  await page.route('**/api/v1/cart', (route) => route.fulfill({ json: { success: true, data: { items: [], subtotal: 0, count: 0 } } }))
}

test('customer security and address management work on desktop and mobile', async ({ page }) => {
  await mockCustomerBase(page)
  let passwordPayload: Record<string, string> | null = null
  let addressRows = addresses.map((address) => ({ ...address }))
  await page.route('**/api/v1/account/password', async (route) => { passwordPayload = route.request().postDataJSON(); await route.fulfill({ json: { success: true, data: null } }) })
  await page.route('**/api/v1/account/addresses/**', async (route) => {
    const id = Number(new URL(route.request().url()).pathname.split('/').at(-2))
    if (route.request().method() === 'PATCH') addressRows = addressRows.map((address) => ({ ...address, is_default: address.id === id }))
    await route.fulfill({ json: { success: true, data: addressRows.find((address) => address.id === id) ?? null } })
  })
  await page.route('**/api/v1/account/addresses', (route) => route.fulfill({ json: { success: true, data: addressRows } }))

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/tai-khoan/bao-mat')
  await expect(page.getByRole('heading', { name: 'Bảo mật' })).toBeVisible()
  await page.getByLabel('Mật khẩu hiện tại').fill('OldPassword123')
  await page.getByLabel('Mật khẩu mới', { exact: true }).fill('NewPassword123')
  await page.getByLabel('Xác nhận mật khẩu mới').fill('Different123')
  await expect(page.getByRole('button', { name: 'Đổi mật khẩu' })).toBeDisabled()
  await page.getByLabel('Xác nhận mật khẩu mới').fill('NewPassword123')
  await page.getByRole('button', { name: 'Đổi mật khẩu' }).click()
  await expect.poll(() => passwordPayload).toEqual({ current_password: 'OldPassword123', password: 'NewPassword123', password_confirmation: 'NewPassword123' })
  await page.screenshot({ path: '../artifacts/phase-one-security-desktop.png', fullPage: true })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/tai-khoan/dia-chi')
  await expect(page.getByText('Người nhận A')).toBeVisible()
  await page.getByRole('button', { name: 'Đặt mặc định' }).click()
  await expect(page.locator('article').filter({ hasText: 'Người nhận B' }).getByText('Mặc định')).toBeVisible()
  await page.screenshot({ path: '../artifacts/phase-one-addresses-mobile.png', fullPage: true })
})

test('logged in checkout selects saved address and submits mapped fields', async ({ page }) => {
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: { success: true, data: customer } }))
  const cartItem = { id: 1, product_variant_id: 10, quantity: 1, unit_price: 1500000, variant: { id: 10, sku: 'SKU-10', price: 1500000, current_price: 1500000, status: 'active', stock: 5, attributes: [], product: { id: 5, name: 'Sản phẩm Phase 1', slug: 'san-pham-phase-1', base_sku: 'P1', description: 'Test', status: 'active', is_featured: false, is_new: false, images: [], variants: [], rating_average: 0, reviews_count: 0 } } }
  await page.route('**/api/v1/cart', (route) => route.fulfill({ json: { success: true, data: { items: [cartItem], subtotal: 1500000, count: 1 } } }))
  await page.route('**/api/v1/account/addresses', (route) => route.fulfill({ json: { success: true, data: addresses } }))
  await page.route('**/api/v1/checkout/preview', (route) => route.fulfill({ json: { success: true, data: { subtotal: 1500000, discount_amount: 0, shipping_fee: 0, total_amount: 1500000 } } }))
  let checkoutPayload: Record<string, unknown> | null = null
  await page.route('**/api/v1/checkout/place-order', async (route) => { checkoutPayload = route.request().postDataJSON(); await route.fulfill({ status: 201, json: { success: true, data: { id: 1, order_number: 'PHASE1-E2E', items: [] } } }) })

  await page.goto('/thanh-toan')
  await expect(page.getByRole('textbox', { name: 'Người nhận', exact: true })).toHaveValue('Người nhận A')
  await page.locator('label').filter({ hasText: 'Người nhận B' }).getByRole('radio').check()
  await expect(page.getByLabel('Địa chỉ cụ thể')).toHaveValue('20 Bạch Đằng')
  await page.getByRole('button', { name: 'THANH TOÁN' }).click()
  await expect(page).toHaveURL('/dat-hang-thanh-cong/PHASE1-E2E')
  await expect.poll(() => checkoutPayload).toMatchObject({ customer_name: 'Người nhận B', customer_phone: '0901000002', customer_email: 'customer@example.com', province: 'Đà Nẵng', district: 'Hải Châu', ward: 'Thạch Thang', shipping_address: '20 Bạch Đằng', payment_method: 'cod' })
})

test('admin sees AOV, low stock, brands, payment status and internal note', async ({ page }) => {
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: { success: true, data: admin } }))
  await page.route('**/api/v1/cart', (route) => route.fulfill({ json: { success: true, data: { items: [], subtotal: 0, count: 0 } } }))
  await page.route('**/api/v1/admin/dashboard/summary', (route) => route.fulfill({ json: { success: true, data: { revenue: 5000000, orders: 4, customers: 3, products: 2, average_order_value: 1250000 } } }))
  await page.route('**/api/v1/admin/dashboard/revenue**', (route) => route.fulfill({ json: { success: true, data: [] } }))
  await page.route('**/api/v1/admin/dashboard/order-statuses', (route) => route.fulfill({ json: { success: true, data: [] } }))
  await page.route('**/api/v1/admin/dashboard/top-products', (route) => route.fulfill({ json: { success: true, data: [] } }))
  await page.route('**/api/v1/admin/dashboard/low-stock', (route) => route.fulfill({ json: { success: true, data: [{ id: 1, quantity_on_hand: 3, quantity_reserved: 1, quantity_available: 2, reorder_level: 3, branch: { id: 1, name: 'Chi nhánh trung tâm' }, variant: { id: 10, sku: 'LOW-01', product: { id: 5, name: 'Sản phẩm sắp hết' } } }] } }))
  await page.route('**/api/v1/admin/brands**', (route) => route.fulfill({ json: { success: true, data: { current_page: 1, data: [{ id: 1, name: 'Brand Phase 1', slug: 'brand-phase-1', description: 'Mô tả', is_active: true }], last_page: 1, per_page: 20, total: 1 } } }))
  let order = { id: 1, order_number: 'ADMIN-P1', total_amount: 1000000, subtotal: 1000000, discount_amount: 0, shipping_fee: 0, payment_method: 'cod', payment_status: 'unpaid', order_status: 'pending', created_at: '2026-08-28T00:00:00Z', customer_name: 'Khách hàng', customer_phone: '0900000000', shipping_address: 'Địa chỉ giao hàng', admin_note: null as string | null, items: [{ id: 1, product_name: 'Sản phẩm', sku: 'SKU-1', unit_price: 1000000, quantity: 1, line_total: 1000000 }] }
  await page.route('**/api/v1/admin/orders/1/payment-status', async (route) => { order = { ...order, payment_status: route.request().postDataJSON().payment_status }; await route.fulfill({ json: { success: true, data: order } }) })
  await page.route('**/api/v1/admin/orders/1/notes', async (route) => { order = { ...order, admin_note: route.request().postDataJSON().admin_note }; await route.fulfill({ json: { success: true, data: order } }) })
  await page.route('**/api/v1/admin/orders/1', (route) => route.fulfill({ json: { success: true, data: order } }))

  await page.goto('/admin/dashboard')
  await expect(page.getByText('Giá trị đơn trung bình')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Sản phẩm sắp hết hàng' })).toBeVisible()
  await page.goto('/admin/brands')
  await expect(page.getByText('Brand Phase 1')).toBeVisible()
  await page.goto('/admin/orders/1')
  await page.getByLabel('Trạng thái thanh toán').selectOption('paid')
  await page.getByRole('button', { name: 'Lưu thanh toán' }).click()
  const noteCard = page.locator('.card').filter({ hasText: 'Ghi chú nội bộ' })
  await noteCard.locator('textarea').fill('Gọi khách trước khi giao.')
  await noteCard.getByRole('button', { name: 'Lưu ghi chú' }).click()
  await expect.poll(() => order.payment_status).toBe('paid')
  await expect.poll(() => order.admin_note).toBe('Gọi khách trước khi giao.')
  await page.screenshot({ path: '../artifacts/phase-one-admin-order-desktop.png', fullPage: true })
})
