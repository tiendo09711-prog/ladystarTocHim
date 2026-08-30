import { expect, test } from '@playwright/test'

test('nút ưu đãi mở trang ưu đãi riêng', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Tin tức & ưu đãi' }).hover()
  await page.getByRole('link', { name: 'Ưu đãi', exact: true }).click()
  await expect(page).toHaveURL('/uu-dai')
  await expect(page.getByRole('heading', { level: 1, name: 'Ưu đãi dành riêng cho bạn' })).toBeVisible({ timeout: 20_000 })
})

test('hệ thống cửa hàng là liên kết đơn đến trang trống', async ({ page }) => {
  await page.goto('/')
  const storeSystemLink = page.getByRole('link', { name: 'Hệ thống cửa hàng', exact: true })

  await expect(storeSystemLink).toHaveAttribute('href', '/he-thong-cua-hang')
  await expect(page.getByRole('link', { name: 'Cơ sở Hà Nội', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Cơ sở Hồ Chí Minh', exact: true })).toHaveCount(0)
  await storeSystemLink.click()
  await expect(page).toHaveURL('/he-thong-cua-hang')
  await expect(page.getByRole('heading', { level: 1, name: 'Tìm điểm tư vấn gần bạn' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Quy trình tư vấn và đặt hàng' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Cam kết dành cho bạn' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Gửi yêu cầu tư vấn' })).toBeVisible()
  await page.screenshot({ path: '../artifacts/store-locations-desktop.png', fullPage: true })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Mở menu' }).click()
  await page.getByRole('link', { name: 'Hệ thống cửa hàng', exact: true }).click()
  await expect(page).toHaveURL('/he-thong-cua-hang')

  for (const location of ['ha-noi', 'ho-chi-minh']) {
    await page.goto(`/lien-he?location=${location}`)
    await expect(page).toHaveURL(`/lien-he?location=${location}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Mỗi lựa chọn đẹp bắt đầu từ một cuộc trò chuyện' })).toBeVisible({ timeout: 20_000 })
  }
})

test('khách khám phá trang chủ và thêm vào giỏ', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Vẻ đẹp tự nhiên, được thiết kế riêng cho bạn/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Danh mục sản phẩm và dịch vụ' })).toBeVisible()
  await expect(page.locator('.store-header-main .store-booking-link')).toBeVisible()
  expect(await page.locator('.store-navigation a').evaluateAll((links) => links.filter((link) => link.getAttribute('href') === '/lien-he').length)).toBe(1)
  await page.screenshot({ path: '../artifacts/ladystars-home-desktop.png' })
  await page.getByRole('button', { name: 'Sản phẩm & dịch vụ' }).hover()
  await expect(page.getByRole('link', { name: 'Tóc giả nữ' })).toBeVisible()
  await page.getByRole('button', { name: 'Tin tức & ưu đãi' }).hover()
  await expect(page.getByRole('link', { name: 'Ưu đãi', exact: true })).toBeVisible()
  await page.getByRole('link', { name: /Khám phá sản phẩm/ }).first().click()
  await expect(page).toHaveURL(/san-pham/)
  await page.goBack()
  await page.getByRole('button', { name: 'Sản phẩm & dịch vụ' }).click()
  await page.getByRole('link', { name: 'Tóc giả nam', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.locator('article').first().getByRole('link').first().click()
  await expect(page.getByRole('button', { name: 'ĐẶT MUA NGAY' })).toBeVisible({ timeout: 15_000 })
  for (const group of await page.locator('.product-option-group').all()) await group.locator('button:not([disabled])').first().click()
  await page.getByRole('button', { name: 'ĐẶT MUA NGAY' }).click()
  await expect(page.getByText('Thêm vào giỏ hàng thành công!')).toBeVisible()
  await expect(page).toHaveURL('/thanh-toan')
  await expect(page.getByRole('heading', { name: 'Thanh toán', exact: true })).toBeVisible()
})

test('admin đăng nhập và xem dashboard', async ({ page }) => {
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill('admin@namhair.local')
  await page.getByLabel('Mật khẩu').fill('Admin@123456')
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).toHaveURL(/admin\/dashboard/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByText('Doanh thu 30 ngày')).toBeVisible()
})
