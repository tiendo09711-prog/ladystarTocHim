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
  const imageBadge = `Badge hero E2E ${suffix}`
  const trustItem = `Điểm tin cậy E2E ${suffix}`
  await subtitleField.fill(newSubtitle)
  await heroCard.getByLabel('Nhãn trên ảnh').fill(imageBadge)
  await heroCard.getByLabel(/Điểm tin cậy/).fill(trustItem)
  await page.getByRole('button', { name: 'Lưu section' }).click()
  await expect(page.getByText('Đã lưu section.').first()).toBeVisible()

  await heroCard.getByRole('button', { name: 'Chỉnh sửa' }).click()
  await page.getByLabel('Subtitle').fill(`${newSubtitle} lần 2`)
  await page.getByRole('button', { name: 'Lưu section' }).click()
  await expect(page.getByText('Đã lưu section.').first()).toBeVisible()

  await page.goto('/gioi-thieu')
  await expect(page.locator('.about-hero-subtitle')).toContainText(`${suffix} lần 2`)
  await expect(page.getByText(imageBadge)).toBeVisible()
  await expect(page.getByText(trustItem)).toBeVisible()

  await page.goto('/admin/about')
  const storyCard = page.locator('article', { hasText: 'Câu chuyện: đồng cảm' }).first()
  await storyCard.getByRole('button', { name: 'Chỉnh sửa' }).click()
  await storyCard.getByLabel('Vị trí ảnh').selectOption('image-left')
  await storyCard.getByLabel(/Nhãn ngắn/).fill('Tự nhiên\nThoải mái')
  await storyCard.getByRole('button', { name: 'Lưu section' }).click()
  await expect(page.getByText('Đã lưu section.').first()).toBeVisible()

  await page.goto('/gioi-thieu')
  const storySection = page.locator('section[aria-labelledby="about-story-empathy"]')
  await expect(storySection.locator('.about-story-visual')).not.toHaveClass(/about-story-visual-right/)
  await expect(storySection.getByText('Tự nhiên', { exact: true })).toBeVisible()
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

test('admin mở và lưu lại thiết lập trang bản tin', async ({ page }) => {
  await loginAdmin(page)
  await page.goto('/admin/news/settings')
  await expect(page.getByRole('heading', { name: 'Thiết lập trang bản tin' })).toBeVisible()
  const title = page.getByLabel('Tiêu đề H1')
  const currentTitle = await title.inputValue()
  await title.fill(currentTitle)
  await page.getByRole('button', { name: 'Lưu thiết lập' }).click()
  await expect(page.getByText('Đã lưu thiết lập trang bản tin.')).toBeVisible()
  await page.goto('/tin-tuc')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(currentTitle)
})
