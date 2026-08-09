import { expect, test } from '@playwright/test'

test('trang hệ thống cửa hàng hiển thị đầy đủ trên desktop và mobile', async ({ page }) => {
  await page.goto('/he-thong-cua-hang')
  await expect(page.getByRole('heading', { level: 1, name: 'Tìm điểm tư vấn gần bạn' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Quy trình tư vấn và đặt hàng' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Cam kết dành cho bạn' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Gửi yêu cầu tư vấn' })).toBeVisible()
  await page.screenshot({ path: '../artifacts/store-locations-desktop.png', fullPage: true })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Tìm điểm tư vấn gần bạn' })).toBeVisible()
  await expect(page.getByLabel('Họ và tên')).toBeVisible()
  await page.screenshot({ path: '../artifacts/store-locations-mobile.png', fullPage: true })
})
