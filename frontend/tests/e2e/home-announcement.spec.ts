import { expect, test } from '@playwright/test'

const homeContent = {
  id: 1,
  page_key: 'home',
  announcement_messages: ['Thông báo đầu tiên', 'Thông báo thứ hai'],
  announcement_interval_seconds: 3,
  announcement_enabled: true,
}

test('thanh thông báo tự động chuyển sang dòng kế tiếp', async ({ page }) => {
  await page.route('**/api/v1/home-page', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: homeContent }),
  }))

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const items = page.locator('.store-announcement-item')
  await expect(items.nth(0)).toContainText('Thông báo đầu tiên')
  await expect(items.nth(0)).toHaveAttribute('aria-hidden', 'false')
  await expect(items.nth(1)).toHaveAttribute('aria-hidden', 'false', { timeout: 4_000 })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.store-announcement')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('admin chỉnh sửa và lưu cấu hình thanh thông báo', async ({ page }) => {
  let savedPayload: Record<string, unknown> | null = null
  await page.route('**/api/v1/admin/home-page', async (route) => {
    if (route.request().method() === 'PUT') {
      const payload = route.request().postDataJSON() as Record<string, unknown>
      savedPayload = payload
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { ...homeContent, ...payload } }) })
    }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: homeContent }) })
  })

  await page.goto('/admin/login')
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).toHaveURL(/admin\/dashboard/)
  await page.goto('/admin/home-page')
  await expect(page.getByRole('heading', { name: 'Chỉnh sửa trang chủ' })).toBeVisible()
  await page.getByLabel('Các dòng thông báo').fill('Dòng mới thứ nhất\nDòng mới thứ hai')
  await page.getByLabel('Thời gian chuyển dòng (giây)').fill('8')
  await page.getByRole('button', { name: 'Lưu nội dung trang chủ' }).click()
  await expect(page.getByText('Đã lưu nội dung trang chủ.')).toBeVisible()
  expect(savedPayload).toEqual({
    announcement_messages: ['Dòng mới thứ nhất', 'Dòng mới thứ hai'],
    announcement_interval_seconds: 8,
    announcement_enabled: true,
  })
})
