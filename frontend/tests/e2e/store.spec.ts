import { expect, test } from '@playwright/test'

test('khách xem sản phẩm và thêm vào giỏ', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Tự tin với mái tóc/ })).toBeVisible()
  await page.getByRole('link', { name: 'Sản phẩm', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'Tất cả sản phẩm' })).toBeVisible()
  await page.locator('article').first().getByRole('link').first().click()
  await expect(page.getByRole('button', { name: /Thêm vào giỏ/ })).toBeVisible()
  await page.getByRole('button', { name: /Thêm vào giỏ/ }).click()
  await expect(page.getByText('Đã thêm sản phẩm vào giỏ hàng.')).toBeVisible()
  await page.getByRole('link', { name: /Giỏ hàng/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Giỏ hàng' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tiến hành thanh toán' })).toBeVisible()
})

test('admin đăng nhập và xem dashboard', async ({ page }) => {
  await page.goto('/admin/login')
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).toHaveURL(/admin\/dashboard/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByText('Doanh thu 30 ngày')).toBeVisible()
})
