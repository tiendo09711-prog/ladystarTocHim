import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 60_000 })

async function loginAdmin(page: import('@playwright/test').Page) {
  await page.goto('/admin/login')
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).toHaveURL(/admin\/dashboard/)
}

test('layout admin hiển thị đầy đủ tiếng Việt', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await loginAdmin(page)
  const sidebarText = await page.locator('aside nav').innerText()
  const labels = [
    'Sản phẩm',
    'Danh mục',
    'Thuộc tính',
    'Chi nhánh',
    'Tồn kho',
    'Lịch sử kho',
    'Đơn hàng',
    'Khách hàng',
    'Đánh giá',
    'Mã giảm giá',
    'Báo cáo',
    'Nội dung About',
    'Bản tin',
    'Cài đặt',
  ]

  for (const label of labels) expect(sidebarText).toContain(label)
  await expect(page.getByText('Khu vực quản trị')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Đăng xuất' })).toBeVisible()
  expect(sidebarText).not.toMatch(/[\u0080-\u009f\u00ba\u00bb\ufffd]|Ã.|Ä.|Æ./u)

  const dashboardLink = page.getByRole('link', { name: 'Dashboard', exact: true })
  await expect(dashboardLink).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(dashboardLink).toHaveCSS('color', 'rgb(75, 46, 31)')

  await page.getByRole('link', { name: 'Sản phẩm', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Sản phẩm', exact: true })).toHaveCSS('color', 'rgb(75, 46, 31)')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Mở menu quản trị' }).click()
  await expect(page.getByRole('link', { name: 'Sản phẩm', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Đóng menu', exact: true })).toBeVisible()
})

test('admin quản lý thuộc tính, coupon và cấu hình', async ({ page }) => {
  await loginAdmin(page)
  const suffix = Date.now().toString().slice(-7)
  await page.goto('/admin/attributes')
  await page.getByRole('button', { name: 'Thêm thuộc tính' }).click()
  await page.getByLabel('Tên thuộc tính').fill(`Thuộc tính E2E ${suffix}`)
  await page.getByLabel('Mã', { exact: true }).fill(`e2e_${suffix}`)
  await page.getByRole('button', { name: 'Lưu thuộc tính' }).click()
  await expect(page.getByText(`Thuộc tính E2E ${suffix}`)).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: `Xóa Thuộc tính E2E ${suffix}` }).click()
  await expect(page.getByText(`Thuộc tính E2E ${suffix}`)).not.toBeVisible()
  await page.goto('/admin/coupons')
  await page.getByRole('button', { name: 'Thêm mã' }).click()
  await page.getByLabel('Mã', { exact: true }).fill(`E2E${suffix}`)
  await page.getByLabel('Giá trị').fill('12')
  await page.getByRole('button', { name: 'Lưu mã' }).click()
  const couponRow = page.getByRole('row').filter({ hasText: `E2E${suffix}` })
  await expect(couponRow).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await couponRow.getByRole('button').last().click()
  await expect(couponRow).not.toBeVisible()
  await page.goto('/admin/settings')
  await expect(page.getByRole('heading', { name: 'Cài đặt cửa hàng' })).toBeVisible()
  await page.getByRole('button', { name: 'Lưu cấu hình' }).click()
  await expect(page.getByText('Đã lưu cấu hình cửa hàng.')).toBeVisible()
})

test('admin tải ảnh sản phẩm và xóa lại thành công', async ({ page }) => {
  await loginAdmin(page)
  await page.goto('/admin/products')
  await page.getByRole('row').nth(1).getByRole('link').click()
  await expect(page.getByRole('heading', { name: 'Chỉnh sửa sản phẩm' })).toBeVisible()
  const editUrl = page.url()
  const initialImageCount = await page.getByRole('button', { name: 'Xóa', exact: true }).count()
  await page.locator('input[type="file"]').setInputFiles({ name: 'e2e-product.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4xQAAAAASUVORK5CYII=', 'base64') })
  await page.getByRole('button', { name: 'Lưu sản phẩm' }).click()
  await expect(page).toHaveURL(/admin\/products$/)
  await page.goto(editUrl)
  await expect(page.getByRole('heading', { name: 'Chỉnh sửa sản phẩm' })).toBeVisible({ timeout: 15_000 })
  const deleteButtons = page.getByRole('button', { name: 'Xóa', exact: true })
  await expect(deleteButtons).toHaveCount(initialImageCount + 1)
  page.once('dialog', (dialog) => dialog.accept())
  await deleteButtons.last().click()
  await expect(page.getByRole('button', { name: 'Xóa', exact: true })).toHaveCount(initialImageCount)
})
