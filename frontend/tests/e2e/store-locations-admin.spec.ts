import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 90_000 })

test('admin cập nhật tiêu đề trang hệ thống cửa hàng', async ({ page }) => {
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill('admin@namhair.local')
  await page.getByLabel('Mật khẩu').fill('Admin@123456')
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).toHaveURL(/admin\/dashboard/, { timeout: 20_000 })

  await page.goto('/admin/store-page')
  await expect(page.getByRole('heading', { name: 'Trang hệ thống cửa hàng' })).toBeVisible()
  const title = page.getByLabel('Tiêu đề H1')
  const currentTitle = await title.inputValue()
  await title.fill(currentTitle)
  await page.getByRole('button', { name: 'Lưu thiết lập trang' }).click()
  await expect(page.getByText('Đã lưu thiết lập trang hệ thống cửa hàng.')).toBeVisible()

  await page.goto('/he-thong-cua-hang')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(currentTitle)
})
