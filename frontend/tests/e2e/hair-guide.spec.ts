import { expect, test, type Page } from '@playwright/test'

const services = Array.from({ length: 7 }, (_, index) => ({
  id: index + 1,
  name: ['Vệ sinh tóc giả', 'Detox da đầu', 'Thuê tóc giả', 'Hấp tóc giả', 'Nhuộm màu tóc giả', 'Cắt tóc giả', 'Massage cổ vai gáy'][index],
  slug: `service-${index + 1}`,
  short_description: 'Dịch vụ chăm sóc chuyên nghiệp tại LADYSTARS.',
  price: [100000, 50000, 500000, 350000, 350000, 180000, 100000][index],
  image_path: null,
  image_alt: null,
  sort_order: (index + 1) * 10,
  status: 'active',
}))

async function mockAdmin(page: Page) {
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204 }))
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/auth/me')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: 1, name: 'Admin', email: 'admin@example.test', role: 'admin', status: 'active' } }) })
    if (path.endsWith('/admin/services')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: services }) })
    if (path.endsWith('/cart')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { items: [], subtotal: 0, count: 0 } }) })
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) })
  })
}

test('service page desktop renders seven database services and submits booking', async ({ page }) => {
  await page.goto('/dich-vu-cham-soc')
  await expect(page).toHaveTitle(/Dịch vụ chăm sóc tóc/)
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Dịch vụ chăm sóc tóc')
  await expect(page.locator('.service-card')).toHaveCount(7)
  await expect(page.locator('.service-card h3').first()).toHaveText('Vệ sinh tóc giả')
  await expect(page.locator('.service-grid').evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)).resolves.toBe(3)
  await expect(page.getByRole('link', { name: /Gọi hotline đặt Vệ sinh tóc giả/ })).toHaveAttribute('href', /^tel:/)

  let payload: Record<string, unknown> | undefined
  page.on('request', (request) => { if (request.url().endsWith('/api/v1/consultation-requests') && request.method() === 'POST') payload = request.postDataJSON() as Record<string, unknown> })
  await page.getByRole('button', { name: 'Đặt lịch giữ chỗ cho Vệ sinh tóc giả' }).click()
  const dialog = page.getByRole('dialog', { name: 'Đặt lịch dịch vụ' })
  await dialog.getByLabel('Họ và tên').fill('Khách dịch vụ E2E')
  await dialog.getByLabel('Số điện thoại').fill('0901234567')
  await dialog.getByLabel('Nhu cầu / ghi chú').fill('Kiểm tra booking dịch vụ')
  const responsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/consultation-requests') && response.request().method() === 'POST')
  await dialog.getByRole('button', { name: 'Đặt lịch', exact: true }).click()
  expect((await responsePromise).status()).toBe(201)
  await expect(page.getByRole('heading', { name: 'Xác nhận đăng ký thành công!' })).toBeVisible()
  expect(payload?.service_id).toBe(1)
  expect(payload?.source_page).toBe('/dich-vu-cham-soc')
  await page.screenshot({ path: '../artifacts/service-page/desktop-1440x900.png', fullPage: true })
})

test('service page mobile has one column and no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/dich-vu-cham-soc')
  await expect(page.locator('.service-card')).toHaveCount(7)
  const layout = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth <= window.innerWidth, columns: getComputedStyle(document.querySelector('.service-grid')!).gridTemplateColumns.split(' ').length, buttonHeight: document.querySelector('.service-book-button')!.getBoundingClientRect().height }))
  expect(layout.overflow).toBe(true)
  expect(layout.columns).toBe(1)
  expect(layout.buttonHeight).toBeGreaterThanOrEqual(44)
  await page.screenshot({ path: '../artifacts/service-page/mobile-390x844.png', fullPage: true })
})

test('admin services page exposes create edit image order and status controls', async ({ page }) => {
  await mockAdmin(page)
  await page.goto('/admin/services')
  await expect(page.getByRole('heading', { name: 'Dịch vụ chăm sóc' })).toBeVisible()
  await expect(page.getByText('Vệ sinh tóc giả', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Sửa' }).first().click()
  await expect(page.getByLabel('Tên dịch vụ')).toHaveValue('Vệ sinh tóc giả')
  await expect(page.getByLabel('Giá (VND)')).toHaveValue('100000')
  await expect(page.getByLabel('Thứ tự')).toHaveValue('10')
  await expect(page.getByLabel('Trạng thái')).toHaveValue('active')
})

test('legacy hair guide URL redirects to service page', async ({ page }) => {
  await page.goto('/huong-dan-chon-toc')
  await expect(page).toHaveURL('/dich-vu-cham-soc')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Dịch vụ chăm sóc tóc')
})
