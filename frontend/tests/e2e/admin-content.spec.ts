import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 90_000 })

async function loginAdmin(page: import('@playwright/test').Page) {
  await page.goto('/admin/login')
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).toHaveURL(/admin\/dashboard/, { timeout: 20_000 })
}

test('admin quản lý section trang giới thiệu', async ({ page }) => {
  await loginAdmin(page)
  await page.goto('/admin/about')
  await expect(page.getByRole('heading', { name: 'Câu chuyện thương hiệu' })).toBeVisible()
  await expect(page.getByText('Hero thương hiệu')).toBeVisible()

  const heroCard = page.locator('article', { hasText: 'Hero thương hiệu' }).first()
  await heroCard.getByRole('button', { name: 'Chỉnh sửa' }).click()
  const subtitleField = page.getByLabel('Subtitle')
  const suffix = Date.now().toString().slice(-6)
  const newSubtitle = `Nội dung hero đã cập nhật ${suffix}`
  await subtitleField.fill(newSubtitle)
  await page.getByRole('button', { name: 'Lưu section' }).click()
  await expect(page.getByText('Đã lưu section.').first()).toBeVisible()

  await page.goto('/gioi-thieu')
  await expect(page.locator('.about-hero-subtitle')).toContainText(suffix)
})

test('admin tạo nháp, xuất bản và dọn dẹp bản tin', async ({ page }) => {
  await loginAdmin(page)
  const suffix = Date.now().toString().slice(-7)
  const title = `Bản tin E2E ${suffix}`
  const slug = `ban-tin-e2e-${suffix}`

  await page.goto('/admin/news')
  await expect(page.getByRole('heading', { name: 'Bản tin' })).toBeVisible()
  await page.getByRole('link', { name: 'Tạo bản tin' }).click()
  await expect(page.getByRole('heading', { name: 'Tạo bản tin' })).toBeVisible()
  await page.getByLabel('Tiêu đề').fill(title)
  await expect(page.getByLabel('Slug')).toHaveValue(slug.replace(/-/g, '-'))
  await page.getByLabel(/^Nội dung/).fill('Đoạn đầu của bản tin E2E.\n\nĐoạn thứ hai của bản tin E2E.')
  await page.getByRole('button', { name: 'Lưu bản nháp' }).click()
  await expect(page).toHaveURL(/admin\/news$/)

  await page.goto('/tin-tuc')
  await expect(page.getByText(title)).not.toBeVisible()

  await page.goto('/admin/news')
  const row = page.getByRole('row').filter({ hasText: title })
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: 'Xuất bản' }).click()
  await expect(page.getByText(/Đã chuyển bài viết sang trạng thái đã xuất bản/)).toBeVisible()

  await page.goto('/tin-tuc')
  await expect(page.getByText(title)).toBeVisible()
  await page.goto(`/tin-tuc/${slug}`)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(title)

  await page.goto('/admin/news')
  const rowAgain = page.getByRole('row').filter({ hasText: title })
  page.once('dialog', (dialog) => dialog.accept())
  await rowAgain.getByRole('button', { name: `Xóa ${title}` }).click()
  await expect(page.getByText('Đã xóa bản tin.')).toBeVisible()
})
