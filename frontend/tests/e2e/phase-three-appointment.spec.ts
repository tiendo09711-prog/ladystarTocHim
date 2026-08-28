import { expect, test, type Page } from '@playwright/test'

test.setTimeout(60_000)

const branch = { id: 1, name: 'LADYSTARS Trung tâm', code: 'TT', is_default: true, is_active: true }
const service = { id: 2, name: 'Bảo dưỡng tóc giả', slug: 'bao-duong', price: 300000, duration_minutes: 60, sort_order: 1, status: 'active' }
const guest = { id: 81, code: 'AP-PHASE3', customer_name: 'Khách đặt lịch', customer_phone: '0900000004', customer_email: null, start_at: '2099-09-01T03:00:00Z', end_at: '2099-09-01T04:00:00Z', status: 'pending', source: 'web', customer_note: 'Tư vấn kỹ', timezone: 'Asia/Ho_Chi_Minh', branch, service }

async function mockPublic(page: Page) {
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ status: 401, json: { message: 'Unauthenticated.' } }))
  await page.route('**/api/v1/cart', (route) => route.fulfill({ json: { success: true, data: { items: [], subtotal: 0, count: 0 } } }))
  await page.route('**/api/v1/home-page', (route) => route.fulfill({ json: { success: true, data: {} } }))
  await page.route('**/api/v1/appointment-options', (route) => route.fulfill({ json: { success: true, data: { branches: [branch], services: [service], timezone: 'Asia/Ho_Chi_Minh' } } }))
  await page.route('**/api/v1/appointment-availability**', (route) => route.fulfill({ json: { success: true, data: { slots: [{ start_at: '2099-09-01T03:00:00Z', end_at: '2099-09-01T04:00:00Z', local_start: '2099-09-01T10:00:00+07:00', capacity: 1 }] } } }))
}

test('guest books, reschedules, cancels and admin completes appointment flow', async ({ page, browser }) => {
  await mockPublic(page)
  let appointment = structuredClone(guest)
  let receivedToken = ''
  await page.route('**/api/v1/appointments', (route) => route.fulfill({ status: 201, json: { success: true, data: { appointment, guest_token: 'guest-token-phase3' } } }))
  await page.route('**/api/v1/guest/appointments/81/reschedule', async (route) => { receivedToken = String(route.request().headers()['x-guest-token'] ?? ''); appointment = { ...appointment, start_at: route.request().postDataJSON().start_at, end_at: '2099-09-01T05:00:00Z' }; await route.fulfill({ json: { success: true, data: appointment } }) })
  await page.route('**/api/v1/guest/appointments/81/cancel', async (route) => { receivedToken = String(route.request().headers()['x-guest-token'] ?? ''); appointment = { ...appointment, status: 'cancelled' }; await route.fulfill({ json: { success: true, data: appointment } }) })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/dat-lich')
  await page.getByLabel('1. Chi nhánh').selectOption('1')
  await page.getByLabel('2. Dịch vụ').selectOption('2')
  await page.getByLabel('3. Ngày').fill('2099-09-01')
  await page.getByLabel('4. Khung giờ').selectOption('2099-09-01T03:00:00Z')
  await page.getByLabel('5. Họ tên').fill('Khách đặt lịch')
  await page.getByLabel('Số điện thoại').fill('0900000004')
  await page.getByLabel('Ghi chú').fill('Tư vấn kỹ')
  await page.getByRole('button', { name: 'Xác nhận đặt lịch' }).click()
  await expect(page.getByText('AP-PHASE3')).toBeVisible()
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage).filter((key) => key.toLowerCase().includes('token')))).toEqual([])
  await page.getByLabel('Thời gian mới').fill('2099-09-01T11:00')
  await page.getByRole('button', { name: 'Đổi lịch' }).click()
  await expect.poll(() => receivedToken).toBe('guest-token-phase3')
  await page.getByRole('button', { name: 'Hủy lịch' }).click()
  await expect(page.getByText('Trạng thái: Đã hủy', { exact: true })).toBeVisible()

  appointment = { ...structuredClone(guest), status: 'pending' }
  const adminContext = await browser.newContext()
  await adminContext.route('**/api/v1/auth/me', (route) => route.fulfill({ json: { success: true, data: { id: 1, name: 'Admin', email: 'admin@example.com', role: 'admin', status: 'active' } } }))
  await adminContext.route('**/api/v1/cart', (route) => route.fulfill({ json: { success: true, data: { items: [], subtotal: 0, count: 0 } } }))
  const adminPage = await adminContext.newPage()
  await adminPage.route('**/api/v1/appointment-options', (route) => route.fulfill({ json: { success: true, data: { branches: [branch], services: [service], timezone: 'Asia/Ho_Chi_Minh' } } }))
  await adminPage.route('**/api/v1/admin/appointment-schedules', (route) => route.request().method() === 'GET' ? route.fulfill({ json: { success: true, data: [] } }) : route.fulfill({ status: 201, json: { success: true, data: { id: 1 } } }))
  await adminPage.route('**/api/v1/admin/appointment-blocks', (route) => route.request().method() === 'GET' ? route.fulfill({ json: { success: true, data: [] } }) : route.fulfill({ status: 201, json: { success: true, data: { id: 1 } } }))
  await adminPage.route('**/api/v1/admin/appointments**', (route) => route.fulfill({ json: { success: true, data: { current_page: 1, data: [appointment], last_page: 1, per_page: 30, total: 1 } } }))
  for (const [action, status] of [['confirm', 'confirmed'], ['check-in', 'checked_in'], ['complete', 'completed']] as const) await adminPage.route(`**/api/v1/admin/appointments/81/${action}`, async (route) => { appointment = { ...appointment, status }; await route.fulfill({ json: { success: true, data: appointment } }) })
  await adminPage.setViewportSize({ width: 1440, height: 900 })
  await adminPage.goto('/admin/appointments')
  await adminPage.getByRole('button', { name: 'Xác nhận' }).click()
  await adminPage.getByRole('button', { name: 'Check-in' }).click()
  await adminPage.getByRole('button', { name: 'Hoàn tất' }).click()
  await expect(adminPage.getByRole('article').getByText('Hoàn thành', { exact: true })).toBeVisible()
  await adminPage.getByRole('button', { name: 'Lịch làm việc' }).click()
  await expect(adminPage.getByRole('heading', { name: 'Thêm lịch làm việc' })).toBeVisible()
  await adminPage.getByRole('button', { name: 'Khoảng chặn' }).click()
  await expect(adminPage.getByRole('heading', { name: 'Chặn thời gian' })).toBeVisible()
})
