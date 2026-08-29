import { expect, test } from '@playwright/test'

test('đặt lịch tư vấn mở popup và xác nhận thành công', async ({ page }) => {
  let requestBody: Record<string, unknown> | undefined
  await page.route('**/sanctum/csrf-cookie', async (route) => route.fulfill({ status: 204 }))
  await page.route('**/api/v1/store-page', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { content: null, steps: [], policies: [], branches: [{ id: 1, name: 'LADYSTARS', code: 'MAIN', phone: '090 123 4567', is_default: true, is_active: true }], seo: null } }),
  }))
  await page.route('**/api/v1/consultation-requests', async (route) => {
    requestBody = route.request().postDataJSON() as Record<string, unknown>
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: 1 } }) })
  })

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Đặt lịch tư vấn' }).click()
  await expect(page).toHaveURL('/')

  const dialog = page.getByRole('dialog', { name: /Tư vấn miễn phí/ })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('.consultation-dialog-media img')).toHaveAttribute('src', '/images/brand/ladystars-hero.svg')
  await expect(dialog.getByRole('link', { name: 'Gọi hotline 090 123 4567' })).toHaveAttribute('href', 'tel:0901234567')
  await dialog.getByLabel('Họ và tên').fill('Nguyễn Văn A')
  await dialog.getByLabel('Số điện thoại').fill('0901234567')
  await page.screenshot({ path: '../artifacts/consultation-dialog-desktop.png' })

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(dialog).toBeVisible()
  await expect(page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).resolves.toBe(true)
  await page.screenshot({ path: '../artifacts/consultation-dialog-mobile.png' })
  await page.setViewportSize({ width: 1440, height: 900 })
  await dialog.getByRole('button', { name: 'Đặt lịch', exact: true }).click()

  await expect.poll(() => requestBody).toMatchObject({ name: 'Nguyễn Văn A', phone: '0901234567', source_page: '/' })
  await expect(page.getByRole('heading', { name: 'Xác nhận đăng ký thành công!' })).toBeVisible()
  await page.screenshot({ path: '../artifacts/consultation-success-desktop.png' })
  await page.getByRole('button', { name: 'Hoàn tất' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
