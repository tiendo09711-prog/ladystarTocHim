import { expect, test } from '@playwright/test'

test('trang hệ thống cửa hàng hiển thị empty-state khi chưa cấu hình', async ({ page }) => {
  await page.route('**/api/v1/store-page', (route) => route.fulfill({ json: { success: true, data: { content: null, steps: [], policies: [], branches: [], seo: null } } }))
  await page.goto('/he-thong-cua-hang')
  await expect(page.getByRole('heading', { name: 'Trang đang được cập nhật' })).toBeVisible()
  await page.screenshot({ path: '../artifacts/store-locations-desktop.png', fullPage: true })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Trang đang được cập nhật' })).toBeVisible()
  await page.screenshot({ path: '../artifacts/store-locations-mobile.png', fullPage: true })
})
