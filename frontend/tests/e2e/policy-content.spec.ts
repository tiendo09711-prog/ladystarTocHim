import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 90_000 })

test('admin xuất bản chính sách và public dùng live shipping settings', async ({ page }) => {
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill('admin@namhair.local')
  await page.getByLabel('Mật khẩu').fill(process.env.E2E_ADMIN_PASSWORD!)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).toHaveURL(/admin\/dashboard/, { timeout: 20_000 })

  await page.goto('/admin/settings')
  await page.getByRole('spinbutton', { name: 'Phí giao hàng', exact: true }).fill('41000')
  await page.getByRole('spinbutton', { name: 'Ngưỡng miễn phí giao hàng', exact: true }).fill('1300000')
  await page.getByLabel('title', { exact: true }).fill('Hair Finder E2E')
  await page.getByRole('button', { name: 'Lưu cấu hình' }).click()
  await expect(page.getByText('Đã lưu cấu hình cửa hàng.')).toBeVisible()

  await page.goto('/admin/policies')
  await page.getByLabel('Tiêu đề').fill('Chính sách giao hàng E2E')
  await page.getByLabel('Tóm tắt').fill('Thông tin giao hàng được quản lý từ Admin.')
  await page.getByLabel('SEO title').fill('Giao hàng | LADYSTARS')
  await page.getByLabel('SEO description').fill('Thông tin giao hàng và miễn phí vận chuyển của LADYSTARS.')
  await page.getByLabel('Mở đầu').fill('Phí tiêu chuẩn {{shipping_fee}}, miễn phí từ {{free_shipping_from}}.')
  await page.getByLabel('Xuất bản trang').check()
  await page.getByRole('button', { name: 'Lưu chính sách' }).click()
  await expect(page.getByText('Đã lưu nội dung chính sách.')).toBeVisible()

  await page.goto('/chinh-sach-giao-hang')
  await expect(page.getByRole('heading', { name: 'Chính sách giao hàng E2E' })).toBeVisible()
  await expect(page.getByText('Phí tiêu chuẩn 41.000 VND, miễn phí từ 1.300.000 VND.')).toBeVisible()

  await page.goto('/tim-mau-toc')
  await expect(page.getByRole('heading', { name: 'Hair Finder E2E' })).toBeVisible()
})
