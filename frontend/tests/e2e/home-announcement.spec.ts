import { expect, test } from '@playwright/test'
import { homeSectionsFixture } from './fixtures/homeContent'

const homeContent = {
  id: 1,
  page_key: 'home',
  announcement_messages: ['Thông báo đầu tiên', 'Thông báo thứ hai'],
  announcement_interval_seconds: 3,
  announcement_enabled: true,
  hero_image_path: null,
  hero_image_alt: null,
  brand_story_image_path: null,
    sections: homeSectionsFixture,
}

test('thanh thông báo tự động chuyển sang dòng kế tiếp', async ({ page }) => {
  await page.route('**/api/v1/home-page', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: homeContent }),
  }))

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const items = page.locator('.store-announcement-item')
  await expect(items.nth(0)).toContainText('Thông báo đầu tiên')
  await expect(items.nth(0)).toHaveAttribute('aria-hidden', 'false')
  await expect(items.nth(1)).toHaveAttribute('aria-hidden', 'false', { timeout: 4_000 })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.store-announcement')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('admin chỉnh sửa và lưu cấu hình thanh thông báo', async ({ page }) => {
  let savedPayload: Record<string, unknown> | null = null
  await page.route('**/api/v1/admin/home-page', async (route) => {
    if (route.request().method() === 'PUT') {
      const payload = route.request().postDataJSON() as Record<string, unknown>
      savedPayload = payload
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { ...homeContent, ...payload } }) })
    }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: homeContent }) })
  })

  await page.goto('/admin/login')
  await page.getByLabel('Email').fill('admin@namhair.local')
  await page.getByLabel('Mật khẩu').fill(process.env.E2E_ADMIN_PASSWORD!)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).toHaveURL(/admin\/dashboard/)
  await page.goto('/admin/home-page')
  await expect(page.getByRole('heading', { name: 'Chỉnh sửa trang chủ' })).toBeVisible()
  await expect(page.getByText('LADYSTARS', { exact: true }).first()).toBeVisible()
  await page.getByLabel('Các dòng thông báo').fill('Dòng mới thứ nhất\nDòng mới thứ hai')
  await page.getByLabel('Thời gian chuyển dòng (giây)').fill('8')
  await page.getByLabel('Tiêu đề Hero').fill('Hero quản trị được')
  await page.getByRole('button', { name: 'Lưu toàn bộ trang chủ' }).click()
  await expect(page.getByText('Đã lưu toàn bộ nội dung trang chủ.')).toBeVisible({ timeout: 20_000 })
  expect(savedPayload).toMatchObject({
    announcement_messages: ['Dòng mới thứ nhất', 'Dòng mới thứ hai'],
    announcement_interval_seconds: 8,
    announcement_enabled: true,
    hero_image_alt: null,
    sections: { hero: { title: 'Hero quản trị được' } },
  })
})

test('admin cập nhật nội dung và các ảnh riêng của trang chủ', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill('admin@namhair.local')
  await page.getByLabel('Mật khẩu').fill(process.env.E2E_ADMIN_PASSWORD!)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).toHaveURL(/admin\/dashboard/)
  await page.goto('/admin/home-page')

  const heroDetails = page.locator('details').filter({ hasText: 'Nội dung Hero' })
  const storyDetails = page.locator('details').filter({ hasText: 'Câu chuyện thương hiệu' })
  const solutionsDetails = page.locator('details').filter({ hasText: 'Giải pháp dành cho bạn' })
  const stylesDetails = page.locator('details').filter({ hasText: 'Cảm hứng phong cách' })
  const processDetails = page.locator('details').filter({ hasText: 'Quy trình LADYSTARS' })
  const testimonialsDetails = page.locator('details').filter({ hasText: 'Cảm nhận khách hàng' })
  await storyDetails.locator('summary').click()
  await solutionsDetails.locator('summary').click()
  await stylesDetails.locator('summary').click()
  await processDetails.locator('summary').click()
  await testimonialsDetails.locator('summary').click()

  const heroTitle = heroDetails.getByLabel('Tiêu đề Hero')
  const storyTitle = storyDetails.getByLabel('Tiêu đề', { exact: true })
  const originalTitle = await heroTitle.inputValue()
  const originalStoryTitle = await storyTitle.inputValue()
  const testimonialDetailTitle = testimonialsDetails.getByLabel('Tiêu đề bài cảm nhận 1')
  const testimonialDetail = testimonialsDetails.getByLabel('Nội dung chi tiết cảm nhận 1')
  const originalTestimonialDetailTitle = await testimonialDetailTitle.inputValue()
  const originalTestimonialDetail = await testimonialDetail.inputValue()
  const updatedTitle = `Hero CMS ${Date.now().toString().slice(-6)}`
  const updatedStoryTitle = `Câu chuyện CMS ${Date.now().toString().slice(-6)}`
  const updatedTestimonialDetailTitle = `Câu chuyện khách hàng ${Date.now().toString().slice(-6)}`
  const updatedTestimonialDetail = 'Nội dung cảm nhận chi tiết được chỉnh trực tiếp từ trang quản trị và hiển thị trong hộp thoại.'
  await heroTitle.fill(updatedTitle)
  await storyTitle.fill(updatedStoryTitle)
  await testimonialDetailTitle.fill(updatedTestimonialDetailTitle)
  await testimonialDetail.fill(updatedTestimonialDetail)
  await page.getByRole('button', { name: 'Lưu toàn bộ trang chủ' }).click()
  await expect(page.getByText('Đã lưu toàn bộ nội dung trang chủ.')).toBeVisible({ timeout: 20_000 })

  const image = {
    name: 'hero.png',
    mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nH0AAAAASUVORK5CYII=', 'base64'),
  }
  await heroDetails.getByLabel('Chọn ảnh Hero').setInputFiles(image)
  await expect(page.getByRole('dialog', { name: 'Cắt ảnh Hero' })).toBeVisible()
  await page.getByRole('button', { name: 'Dùng ảnh đã cắt' }).click()
  await expect(page.getByText('Đã cập nhật ảnh Hero.')).toBeVisible()
  await storyTitle.fill(`${updatedStoryTitle} chưa lưu`)
  await storyDetails.getByLabel('Chọn ảnh Câu chuyện thương hiệu').setInputFiles({ ...image, name: 'brand-story.png' })
  await expect(page.getByRole('dialog', { name: 'Cắt ảnh Câu chuyện thương hiệu' })).toBeVisible()
  await page.getByRole('button', { name: 'Dùng ảnh đã cắt' }).click()
  await expect(page.getByText('Đã cập nhật ảnh Câu chuyện thương hiệu.')).toBeVisible()
  await expect(storyTitle).toHaveValue(`${updatedStoryTitle} chưa lưu`)
  await solutionsDetails.getByLabel('Chọn ảnh Giải pháp dành cho bạn').setInputFiles({ ...image, name: 'solutions.png' })
  await expect(page.getByRole('dialog', { name: 'Cắt ảnh Giải pháp dành cho bạn' })).toBeVisible()
  await page.getByRole('button', { name: 'Dùng ảnh đã cắt' }).click()
  await expect(page.getByText('Đã cập nhật ảnh Giải pháp dành cho bạn.')).toBeVisible()
  await stylesDetails.getByLabel('Chọn ảnh Phong cách 1').setInputFiles({ ...image, name: 'style.png' })
  await expect(page.getByRole('dialog', { name: 'Cắt ảnh Phong cách 1' })).toBeVisible()
  await page.getByRole('button', { name: 'Dùng ảnh đã cắt' }).click()
  await expect(page.getByText('Đã cập nhật ảnh Phong cách 1.')).toBeVisible()
  await processDetails.getByLabel('Chọn ảnh Bước 01').setInputFiles({ ...image, name: 'process.png' })
  await expect(page.getByRole('dialog', { name: 'Cắt ảnh Bước 01' })).toBeVisible()
  await page.getByRole('button', { name: 'Dùng ảnh đã cắt' }).click()
  await expect(page.getByText('Đã cập nhật ảnh Bước 01.')).toBeVisible()
  await testimonialsDetails.getByLabel('Chọn ảnh Cảm nhận 1').setInputFiles({ ...image, name: 'testimonial.png' })
  await expect(page.getByRole('dialog', { name: 'Cắt ảnh Cảm nhận 1' })).toBeVisible()
  await page.getByRole('button', { name: 'Dùng ảnh đã cắt' }).click()
  await expect(page.getByText('Đã cập nhật ảnh Cảm nhận 1.')).toBeVisible()
  await expect(testimonialDetailTitle).toHaveValue(updatedTestimonialDetailTitle)
  await storyTitle.fill(updatedStoryTitle)
  const saveResponse = page.waitForResponse((response) => response.url().includes('/api/v1/admin/home-page') && response.request().method() === 'PUT' && response.ok())
  await page.getByRole('button', { name: 'Lưu toàn bộ trang chủ' }).click()
  await saveResponse
  await expect(page.getByRole('button', { name: 'Lưu toàn bộ trang chủ' })).toBeEnabled()

  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(updatedTitle)
  await expect(page.getByRole('heading', { name: updatedStoryTitle })).toBeVisible()
  await expect(page.locator('.home-hero-visual img')).toHaveAttribute('src', /\/storage\/home-page\/hero\//)
  await expect(page.locator('.home-story-image img')).toHaveAttribute('src', /\/storage\/home-page\/brand-story\//)
  await expect(page.locator('.home-solution-art img')).toHaveAttribute('src', /\/storage\/home-page\/solutions\//)
  await expect(page.locator('.home-style-card img').first()).toHaveAttribute('src', /\/storage\/home-page\/styles\//)
  await expect(page.locator('.home-process-grid article img').first()).toHaveAttribute('src', /\/storage\/home-page\/process\//)
  await expect(page.locator('.home-testimonial-grid button img').first()).toHaveAttribute('src', /\/storage\/home-page\/testimonials\//)
  await page.getByRole('button', { name: `Đọc cảm nhận: ${updatedTestimonialDetailTitle}` }).click()
  const testimonialDialog = page.getByRole('dialog', { name: updatedTestimonialDetailTitle })
  await expect(testimonialDialog).toBeVisible()
  await expect(testimonialDialog).toContainText(updatedTestimonialDetail)
  await page.getByRole('button', { name: 'Đóng bài cảm nhận' }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.home-solution-art img')).toBeVisible()
  await expect(page.locator('.home-style-card img').first()).toBeVisible()
  await expect(page.locator('.home-process-grid article img').first()).toBeVisible()
  await expect(page.locator('.home-testimonial-mobile')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.locator('.home-testimonial-mobile').click()
  await expect(page.getByRole('dialog', { name: updatedTestimonialDetailTitle })).toBeVisible()
  await page.getByRole('button', { name: 'Đóng bài cảm nhận' }).click()

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/admin/home-page')
  const restoredHeroDetails = page.locator('details').filter({ hasText: 'Nội dung Hero' })
  const restoredStoryDetails = page.locator('details').filter({ hasText: 'Câu chuyện thương hiệu' })
  const restoredSolutionsDetails = page.locator('details').filter({ hasText: 'Giải pháp dành cho bạn' })
  const restoredStylesDetails = page.locator('details').filter({ hasText: 'Cảm hứng phong cách' })
  const restoredProcessDetails = page.locator('details').filter({ hasText: 'Quy trình LADYSTARS' })
  const restoredTestimonialsDetails = page.locator('details').filter({ hasText: 'Cảm nhận khách hàng' })
  await restoredStoryDetails.locator('summary').click()
  await restoredSolutionsDetails.locator('summary').click()
  await restoredStylesDetails.locator('summary').click()
  await restoredProcessDetails.locator('summary').click()
  await restoredTestimonialsDetails.locator('summary').click()
  await restoredHeroDetails.getByLabel('Tiêu đề Hero').fill(originalTitle)
  await restoredStoryDetails.getByLabel('Tiêu đề', { exact: true }).fill(originalStoryTitle)
  await restoredTestimonialsDetails.getByLabel('Tiêu đề bài cảm nhận 1').fill(originalTestimonialDetailTitle)
  await restoredTestimonialsDetails.getByLabel('Nội dung chi tiết cảm nhận 1').fill(originalTestimonialDetail)
  await page.getByRole('button', { name: 'Lưu toàn bộ trang chủ' }).click()
  await expect(page.getByText('Đã lưu toàn bộ nội dung trang chủ.')).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await restoredHeroDetails.getByRole('button', { name: 'Dùng ảnh mặc định' }).click()
  await expect(page.getByText('Đã chuyển về ảnh Hero mặc định.')).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await restoredStoryDetails.getByRole('button', { name: 'Dùng ảnh mặc định' }).click()
  await expect(page.getByText('Đã chuyển về ảnh Câu chuyện thương hiệu mặc định.')).toBeVisible()
  for (const [details, title] of [[restoredSolutionsDetails, 'Giải pháp dành cho bạn'], [restoredStylesDetails, 'Phong cách 1'], [restoredProcessDetails, 'Bước 01'], [restoredTestimonialsDetails, 'Cảm nhận 1']] as const) {
    page.once('dialog', (dialog) => dialog.accept())
    await details.getByRole('button', { name: 'Dùng ảnh mặc định' }).first().click()
    await expect(page.getByText(`Đã chuyển ảnh ${title} về mặc định.`)).toBeVisible()
  }
})
