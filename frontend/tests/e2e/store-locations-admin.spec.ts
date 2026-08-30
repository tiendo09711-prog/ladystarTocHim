import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 90_000 })

test('admin cập nhật tiêu đề trang hệ thống cửa hàng', async ({ page }) => {
  let savedTitle = 'E2E store page'
  await page.route('**/api/v1/admin/store-page', async (route) => {
    if (route.request().method() === 'PUT') savedTitle = String(route.request().postDataJSON().title ?? savedTitle)
    await route.fulfill({ json: { success: true, message: 'Đã lưu thiết lập trang hệ thống cửa hàng.', data: { content: { page_key: 'store-locations', title: savedTitle, settings: {} }, items: [], seo: null } } })
  })
  await page.route('**/api/v1/store-page', (route) => route.fulfill({ json: { success: true, data: { content: { page_key: 'store-locations', title: savedTitle, settings: {} }, steps: [], policies: [], branches: [], seo: null } } }))
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill('admin@namhair.local')
  await page.getByLabel('Mật khẩu').fill(process.env.E2E_ADMIN_PASSWORD!)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).toHaveURL(/admin\/dashboard/, { timeout: 20_000 })

  await page.goto('/admin/store-page')
  await expect(page.getByRole('heading', { name: 'Trang hệ thống cửa hàng' })).toBeVisible()
  const title = page.getByLabel('Tiêu đề H1')
  await title.fill(savedTitle)
  await page.getByRole('button', { name: 'Lưu thiết lập trang' }).click()
  await expect(page.getByText('Đã lưu thiết lập trang hệ thống cửa hàng.')).toBeVisible()

  await page.goto('/he-thong-cua-hang')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(savedTitle)
})
