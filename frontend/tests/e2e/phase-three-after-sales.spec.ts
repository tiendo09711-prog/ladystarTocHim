import { expect, test, type Browser, type Page } from '@playwright/test'

test.setTimeout(60_000)

const user = { id: 2, name: 'Khách Phase 3', email: 'phase3@example.com', phone: '0900000003', role: 'user', status: 'active' }
const admin = { id: 1, name: 'Admin', email: 'admin@example.com', role: 'admin', status: 'active' }
const product = { id: 5, name: 'Tóc giả Phase 3', slug: 'toc-gia-phase-3', base_sku: 'P3', description: '', status: 'active', is_featured: false, is_new: false, images: [], rating_average: 0, reviews_count: 0, variants: [{ id: 11, sku: 'P3-BLACK', price: 1500000, current_price: 1500000, status: 'active', stock: 5, attributes: [] }, { id: 12, sku: 'P3-BROWN', price: 1500000, current_price: 1500000, status: 'active', stock: 3, attributes: [] }] }
const order = { id: 7, order_number: 'LS-PHASE3', total_amount: 1500000, subtotal: 1500000, discount_amount: 0, shipping_fee: 0, payment_method: 'cod', payment_status: 'paid', order_status: 'completed', created_at: '2026-08-20T08:00:00Z', customer_name: user.name, customer_phone: user.phone, shipping_address: '10 Trần Phú', items: [{ id: 21, product_id: 5, product_variant_id: 11, product_name: product.name, sku: 'P3-BLACK', unit_price: 1500000, quantity: 1, line_total: 1500000, warranty_days_snapshot: 30, product }], status_histories: [], payment: { method: 'cod', provider: 'manual', amount: 1500000, status: 'paid' }, shipment: { carrier: 'Nội bộ', tracking_number: 'SHIP-P3', status: 'delivered', delivered_at: '2026-08-21T08:00:00Z' } }

async function mockUserShell(page: Page) {
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: { success: true, data: user } }))
  await page.route('**/api/v1/cart', (route) => route.fulfill({ json: { success: true, data: { items: [], subtotal: 0, count: 0 } } }))
  await page.route('**/api/v1/home-page', (route) => route.fulfill({ json: { success: true, data: {} } }))
  await page.route('**/api/v1/payment-methods', (route) => route.fulfill({ json: { success: true, data: { cod: { enabled: true }, bank_transfer: { enabled: false } } } }))
  await page.route('**/api/v1/account/orders/LS-PHASE3', (route) => route.fulfill({ json: { success: true, data: order } }))
}

async function newAdminPage(browser: Browser) {
  const context = await browser.newContext()
  await context.route('**/api/v1/auth/me', (route) => route.fulfill({ json: { success: true, data: admin } }))
  await context.route('**/api/v1/cart', (route) => route.fulfill({ json: { success: true, data: { items: [], subtotal: 0, count: 0 } } }))
  const page = await context.newPage()
  return page
}

test('return, restock and refund lifecycle is visible to customer', async ({ page, browser }) => {
  await mockUserShell(page)
  let request = { id: 41, code: 'RT-PHASE3', request_type: 'return', status: 'requested', requested_at: '2026-08-28T08:00:00Z', order: { id: 7, order_number: order.order_number, order_status: 'completed' }, customer: { customer_name: user.name, customer_phone: user.phone }, items: [{ id: 51, quantity: 1, reason_code: 'defective', reason_detail: 'Lỗi kỹ thuật', order_item: order.items[0] }], refunds: [] as Array<Record<string, unknown>>, shipments: [] }
  let receivePayload: Record<string, unknown> | null = null
  await page.route('**/api/v1/account/returns', async (route) => route.request().method() === 'POST' ? route.fulfill({ status: 201, json: { success: true, data: request } }) : route.fallback())
  await page.route('**/api/v1/account/returns/41', (route) => route.fulfill({ json: { success: true, data: request } }))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/tai-khoan/don-hang/LS-PHASE3')
  await page.getByRole('button', { name: 'Yêu cầu đổi / trả' }).click()
  await page.getByLabel('Lý do').selectOption('defective')
  await page.getByLabel('Chi tiết').fill('Lỗi kỹ thuật')
  await page.getByRole('button', { name: 'Gửi yêu cầu' }).click()
  await expect(page.getByText('Đã gửi yêu cầu đổi / trả.')).toBeVisible()

  const adminPage = await newAdminPage(browser)
  await adminPage.route('**/api/v1/admin/returns/41/refund-summary', (route) => route.fulfill({ json: { success: true, data: { suggested: 1500000, already_refunded: request.refunds.length ? 1500000 : 0, remaining_payment: request.refunds.length ? 0 : 1500000 } } }))
  await adminPage.route('**/api/v1/admin/returns/41/refund', async (route) => { request = { ...request, refunds: [{ id: 91, code: 'RF-PHASE3', amount: 1500000, method: 'manual_bank_transfer', status: 'pending' }] }; await route.fulfill({ status: 201, json: { success: true, data: request.refunds[0] } }) })
  await adminPage.route('**/api/v1/admin/refunds/91/complete', async (route) => { request = { ...request, refunds: [{ ...request.refunds[0], status: 'completed', completed_at: '2026-08-28T10:00:00Z' }] }; await route.fulfill({ json: { success: true, data: request.refunds[0] } }) })
  for (const action of ['review', 'approve', 'mark-returning', 'receive', 'complete']) {
    await adminPage.route(`**/api/v1/admin/returns/41/${action}`, async (route) => {
      const statuses: Record<string, string> = { review: 'reviewing', approve: 'approved', 'mark-returning': 'returning', receive: 'received', complete: 'completed' }
      if (action === 'receive') receivePayload = route.request().postDataJSON()
      request = { ...request, status: statuses[action] }
      await route.fulfill({ json: { success: true, data: request } })
    })
  }
  await adminPage.route('**/api/v1/admin/returns/41', (route) => route.fulfill({ json: { success: true, data: request } }))
  await adminPage.goto('/admin/returns/41')
  await adminPage.getByRole('button', { name: 'Bắt đầu xem xét' }).click()
  await expect(adminPage.getByText('Đang xem xét', { exact: true })).toBeVisible()
  await adminPage.getByRole('button', { name: 'Duyệt yêu cầu' }).click()
  await expect(adminPage.getByText('Đã duyệt', { exact: true })).toBeVisible()
  await adminPage.getByRole('button', { name: 'Đánh dấu đang hoàn hàng' }).click()
  await expect(adminPage.getByText('Đang hoàn hàng', { exact: true })).toBeVisible()
  await adminPage.getByRole('checkbox', { name: 'Có thể nhập lại kho' }).check()
  await adminPage.getByRole('button', { name: 'Xác nhận đã nhận hàng' }).click()
  await expect.poll(() => receivePayload).toMatchObject({ items: [{ id: 51, restockable: true }] })
  await adminPage.getByRole('button', { name: 'Tạo hoàn tiền' }).click()
  await adminPage.getByRole('button', { name: 'Hoàn tất giao dịch' }).click()
  await adminPage.getByRole('button', { name: 'Hoàn tất yêu cầu' }).click()
  await expect(adminPage.getByText('Hoàn thành', { exact: true })).toBeVisible()

  await page.goto('/tai-khoan/doi-tra/41')
  await expect(page.getByText('RF-PHASE3')).toBeVisible()
  await expect(page.getByText(/1\.500\.000/)).toBeVisible()
})

test('exchange reserves replacement and completes outbound shipment', async ({ page, browser }) => {
  await mockUserShell(page)
  let request = { id: 42, code: 'EX-PHASE3', request_type: 'exchange', status: 'requested', requested_at: '2026-08-28T08:00:00Z', order: { id: 7, order_number: order.order_number, order_status: 'completed' }, customer: { customer_name: user.name, customer_phone: user.phone }, items: [{ id: 52, quantity: 1, reason_code: 'not_suitable', order_item: order.items[0], replacement_variant: { id: 12, sku: 'P3-BROWN' } }], refunds: [], shipments: [] as Array<Record<string, unknown>> }
  let customerPayload = ''
  await page.route('**/api/v1/account/returns', async (route) => { customerPayload = route.request().postData() ?? ''; await route.fulfill({ status: 201, json: { success: true, data: request } }) })
  await page.goto('/tai-khoan/don-hang/LS-PHASE3')
  await page.getByRole('button', { name: 'Yêu cầu đổi / trả' }).click()
  await page.getByLabel('Hình thức').selectOption('exchange')
  await page.getByLabel('Biến thể thay thế').selectOption('12')
  await page.getByRole('button', { name: 'Gửi yêu cầu' }).click()
  await expect.poll(() => customerPayload).toContain('exchange')

  const adminPage = await newAdminPage(browser)
  for (const [action, status] of [['review', 'reviewing'], ['approve', 'approved'], ['receive', 'received']] as const) await adminPage.route(`**/api/v1/admin/returns/42/${action}`, async (route) => { request = { ...request, status }; await route.fulfill({ json: { success: true, data: request } }) })
  await adminPage.route('**/api/v1/admin/returns/42/shipment', async (route) => { request = { ...request, shipments: [{ id: 77, purpose: 'exchange_outbound', carrier: 'Nội bộ', tracking_number: 'EX-SHIP', status: 'pending' }] }; await route.fulfill({ json: { success: true, data: request.shipments[0] } }) })
  await adminPage.route('**/api/v1/admin/returns/42/shipments/77/status', async (route) => { const status = route.request().postDataJSON().status; request = { ...request, status: status === 'delivered' ? 'completed' : request.status, shipments: [{ ...request.shipments[0], status }] }; await route.fulfill({ json: { success: true, data: request.shipments[0] } }) })
  await adminPage.route('**/api/v1/admin/returns/42', (route) => route.fulfill({ json: { success: true, data: request } }))
  await adminPage.goto('/admin/returns/42')
  await adminPage.getByRole('button', { name: 'Bắt đầu xem xét' }).click()
  await expect(adminPage.getByText('Đang xem xét', { exact: true })).toBeVisible()
  await adminPage.getByRole('button', { name: 'Duyệt yêu cầu' }).click()
  await expect(adminPage.getByText('Đã duyệt', { exact: true })).toBeVisible()
  await adminPage.getByRole('button', { name: 'Xác nhận đã nhận hàng' }).click()
  await expect(adminPage.getByText('Đã nhận hàng', { exact: true })).toBeVisible()
  await adminPage.getByPlaceholder('Đơn vị vận chuyển').fill('Nội bộ')
  await adminPage.getByPlaceholder('Mã vận đơn').fill('EX-SHIP')
  await adminPage.locator('form').filter({ has: adminPage.getByPlaceholder('Đơn vị vận chuyển') }).evaluate((form: HTMLFormElement) => form.requestSubmit())
  await adminPage.getByRole('button', { name: 'Đã gửi' }).click()
  await adminPage.getByRole('button', { name: 'Giao thất bại' }).click()
  await expect(adminPage.getByText('Giao hàng thất bại', { exact: false })).toBeVisible()
  await adminPage.getByRole('button', { name: 'Gửi lại' }).click()
  await adminPage.getByRole('button', { name: 'Giao thất bại' }).click()
  await adminPage.getByRole('button', { name: 'Đã hoàn kho' }).click()
  await expect(adminPage.getByText('Đã hoàn về kho', { exact: false })).toBeVisible()
  await adminPage.getByRole('button', { name: 'Xuất gửi lại' }).click()
  await adminPage.getByRole('button', { name: 'Đã giao' }).click()
  await expect(adminPage.getByText('Hoàn thành', { exact: true })).toBeVisible()
})

test('warranty repair lifecycle completes without replacement shipment', async ({ page, browser }) => {
  await mockUserShell(page)
  let warranty = { id: 61, code: 'WR-PHASE3', status: 'requested', issue_type: 'technical', description: 'Bong keo', requested_resolution: 'repair', actual_resolution: null as string | null, requested_at: '2026-08-28T08:00:00Z', order: { id: 7, order_number: order.order_number }, customer: { customer_name: user.name, customer_phone: user.phone }, order_item: order.items[0], media: [], shipments: [] }
  await page.route('**/api/v1/account/warranties', (route) => route.fulfill({ status: 201, json: { success: true, data: warranty } }))
  await page.goto('/tai-khoan/don-hang/LS-PHASE3')
  await page.getByRole('button', { name: 'Yêu cầu bảo hành' }).click()
  await page.getByLabel('Mô tả sự cố').fill('Bong keo')
  await page.getByRole('button', { name: 'Gửi bảo hành' }).click()
  await expect(page.getByText('Đã gửi yêu cầu bảo hành.')).toBeVisible()

  const adminPage = await newAdminPage(browser)
  for (const [action, status] of [['review', 'reviewing'], ['approve', 'approved'], ['receive', 'received'], ['processing', 'processing'], ['ready', 'ready'], ['complete', 'completed']] as const) await adminPage.route(`**/api/v1/admin/warranties/61/${action}`, async (route) => { warranty = { ...warranty, status, actual_resolution: action === 'approve' ? 'repair' : warranty.actual_resolution }; await route.fulfill({ json: { success: true, data: warranty } }) })
  await adminPage.route('**/api/v1/admin/warranties/61', (route) => route.fulfill({ json: { success: true, data: warranty } }))
  await adminPage.goto('/admin/warranties/61')
  await adminPage.getByRole('button', { name: 'Bắt đầu xem xét' }).click()
  await expect(adminPage.getByText('Đang xem xét', { exact: true })).toBeVisible()
  await adminPage.getByRole('button', { name: 'Duyệt bảo hành' }).click()
  await expect(adminPage.getByText('Đã duyệt', { exact: true })).toBeVisible()
  await adminPage.getByRole('button', { name: 'Đã nhận sản phẩm' }).click()
  await expect(adminPage.getByText('Đã nhận hàng', { exact: true })).toBeVisible()
  await adminPage.getByRole('button', { name: 'Bắt đầu xử lý' }).click()
  await expect(adminPage.getByText('Đang xử lý', { exact: true })).toBeVisible()
  await adminPage.getByRole('button', { name: 'Sẵn sàng bàn giao' }).click()
  await expect(adminPage.getByText('Sẵn sàng bàn giao', { exact: true })).toBeVisible()
  await adminPage.getByRole('button', { name: 'Hoàn tất' }).click()
  await expect(adminPage.getByText('Hoàn thành', { exact: true })).toBeVisible()
})
