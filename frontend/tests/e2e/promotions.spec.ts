import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 90_000 })

async function loginAdmin(page: import('@playwright/test').Page) {
  await page.goto('/admin/login')
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).toHaveURL(/admin\/dashboard/, { timeout: 20_000 })
}

test('trang ưu đãi desktop hiển thị đầy đủ và không tràn ngang', async ({ page }) => {
  await page.goto('/uu-dai')
  await expect(page).toHaveTitle(/Ưu đãi/)
  await expect(page.getByRole('heading', { name: 'Ưu đãi dành riêng cho bạn' })).toBeVisible()
  await expect(page.getByText('Chưa có ưu đãi')).toBeVisible()
  await expect(page.locator('.news-featured-card')).toHaveCount(0)
  await expect(page.locator('.promotions-grid .news-card')).toHaveCount(0)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  await page.screenshot({ path: '../artifacts/promotions-desktop.png', fullPage: true })
})

test('trang ưu đãi mobile giữ bố cục và không tràn ngang', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/uu-dai')
  await expect(page.getByRole('heading', { name: 'Ưu đãi dành riêng cho bạn' })).toBeVisible()
  await expect(page.getByText('Chưa có ưu đãi')).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  await page.screenshot({ path: '../artifacts/promotions-mobile.png', fullPage: true })
})

test('admin tạo, xuất bản và xóa ưu đãi', async ({ page }) => {
  await loginAdmin(page)
  const suffix = Date.now().toString().slice(-7)
  const title = `Ưu đãi E2E ${suffix}`
  const slug = `uu-dai-e2e-${suffix}`

  await page.goto('/admin/promotions/create')
  await page.getByLabel('Tiêu đề').fill(title)
  await page.getByLabel('Slug').fill(slug)
  await page.getByLabel('Tóm tắt').fill('Ưu đãi được tạo để kiểm tra luồng quản trị.')
  await page.getByLabel('Nội dung').fill('Nội dung ưu đãi E2E đầy đủ.')
  await page.getByRole('button', { name: 'Xuất bản' }).click()
  await expect(page).toHaveURL(/admin\/promotions$/)
  await expect(page.getByText(title)).toBeVisible()

  await page.goto('/uu-dai')
  await expect(page.getByRole('heading', { name: title })).toBeVisible()

  await page.goto('/admin/promotions')
  const row = page.getByRole('row').filter({ hasText: title })
  page.once('dialog', (dialog) => dialog.accept())
  await row.getByRole('button', { name: `Xóa ${title}` }).click()
  await expect(page.getByText('Đã xóa ưu đãi.')).toBeVisible()
})

test('admin chỉnh tiêu đề trang ưu đãi và khôi phục lại', async ({ page }) => {
  await loginAdmin(page)
  await page.goto('/admin/promotions/settings')
  const titleInput = page.getByLabel('Tiêu đề trang')
  const originalTitle = await titleInput.inputValue()
  const updatedTitle = `${originalTitle} E2E`
  await titleInput.fill(updatedTitle)
  await page.getByRole('button', { name: 'Lưu thiết lập' }).click()
  await expect(page.getByText('Đã lưu thiết lập trang ưu đãi.')).toBeVisible()
  await page.goto('/uu-dai')
  await expect(page.getByRole('heading', { name: updatedTitle })).toBeVisible()
  await page.goto('/admin/promotions/settings')
  await page.getByLabel('Tiêu đề trang').fill(originalTitle)
  await page.getByRole('button', { name: 'Lưu thiết lập' }).click()
  await expect(page.getByText('Đã lưu thiết lập trang ưu đãi.')).toBeVisible()
})
