import { expect, test } from '@playwright/test'
import { homeContentFixture } from './fixtures/homeContent'

test.use({ viewport: { width: 390, height: 844 } })

test('menu cửa hàng hoạt động trên mobile', async ({ page }) => {
  await page.goto('/')
  await page.screenshot({ path: '../artifacts/ladystars-home-mobile.png' })
  await page.getByRole('button', { name: 'Mở menu' }).click()
  await page.getByRole('button', { name: 'Sản phẩm', exact: true }).click()
  await expect(page.locator('.store-dropdown a[href^="/danh-muc/"]').first()).toBeVisible()
  await page.getByRole('button', { name: 'Mở menu' }).click()
  await page.getByRole('button', { name: 'Mở tìm kiếm' }).click()
  await page.getByRole('textbox', { name: 'Tìm kiếm sản phẩm' }).fill('toupee')
  await page.getByRole('textbox', { name: 'Tìm kiếm sản phẩm' }).press('Enter')
  await expect(page).toHaveURL(/tim-kiem\?search=toupee/)
})

test('trang chủ không tràn ngang và dock hỗ trợ mở được', async ({ page }) => {
  await page.route('**/api/v1/home-page', (route) => route.fulfill({ json: { success: true, data: homeContentFixture } }))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Vẻ đẹp tự nhiên/ })).toBeVisible()
  await page.getByRole('button', { name: 'Mở hỗ trợ' }).click()
  await expect(page.locator('.home-contact-dock-links').getByRole('link', { name: 'Đặt lịch tư vấn' })).toBeVisible()
  await expect(page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).resolves.toBe(true)
})
