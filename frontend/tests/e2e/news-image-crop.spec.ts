import { expect, test } from '@playwright/test'

async function loginAdmin(page: import('@playwright/test').Page) {
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill('admin@namhair.local')
  await page.getByLabel('Mật khẩu').fill(process.env.E2E_ADMIN_PASSWORD!)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).toHaveURL(/admin\/dashboard/, { timeout: 20_000 })
}

async function sourceImage(page: import('@playwright/test').Page) {
  return Buffer.from(await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 900
    canvas.height = 1200
    const context = canvas.getContext('2d')!
    context.fillStyle = '#7f3f52'
    context.fillRect(0, 0, 900, 600)
    context.fillStyle = '#efc2cc'
    context.fillRect(0, 600, 900, 600)
    return canvas.toDataURL('image/png').split(',')[1]
  }), 'base64')
}

test('admin cắt ảnh bìa bản tin 16:9 trước khi upload', async ({ page }) => {
  test.setTimeout(60_000)
  await loginAdmin(page)
  let uploadedBody: Buffer | null = null
  await page.route('**/api/v1/admin/news', async (route) => {
    if (route.request().method() === 'POST') return route.fulfill({ status: 201, json: { success: true, data: { id: 41, title: 'Bản tin crop', slug: 'ban-tin-crop', status: 'draft' } } })
    return route.continue()
  })
  await page.route('**/api/v1/admin/news/41/cover-image', async (route) => {
    uploadedBody = route.request().postDataBuffer()
    return route.fulfill({ status: 201, json: { success: true, data: { id: 41, cover_image_path: '/images/product-placeholder.svg' } } })
  })

  await page.goto('/admin/news/create')
  await page.getByLabel('Tiêu đề').fill('Bản tin crop')
  await page.getByLabel('Chọn ảnh bìa bản tin').setInputFiles({ name: 'news-cover-source.png', mimeType: 'image/png', buffer: await sourceImage(page) })
  const dialog = page.getByRole('dialog', { name: 'Cắt ảnh bìa bản tin' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('tỷ lệ 16:9')
  await page.screenshot({ path: '../artifacts/admin-news-cover-crop.png', fullPage: true })
  await page.getByLabel('Căn dọc ảnh bìa bản tin').fill('0.4')
  await page.getByRole('button', { name: 'Dùng ảnh đã cắt' }).click()
  const preview = page.locator('.home-image-admin-preview.is-newsCover')
  await expect(preview).toBeVisible()
  await expect(page.getByText('news-cover-source-cropped.webp')).toBeVisible()
  await page.getByRole('button', { name: 'Lưu bản nháp' }).click()
  await expect(page).toHaveURL(/admin\/news$/)
  expect(uploadedBody).not.toBeNull()
  expect(uploadedBody!.includes(Buffer.from('news-cover-source-cropped.webp'))).toBeTruthy()
  expect(uploadedBody!.includes(Buffer.from('image/webp'))).toBeTruthy()
})

test('admin cắt ảnh CTA bản tin 4:3 trước khi upload', async ({ page }) => {
  await loginAdmin(page)
  const adminData = { content: { eyebrow: 'TIN TỨC', title: 'Bản tin LADYSTARS', description: 'Mô tả', featured_article_id: null, featured_badge_label: 'Nổi bật', list_eyebrow: 'MỚI', list_title: 'Bài mới', list_description: 'Mô tả', show_cta: true, cta_eyebrow: 'CTA', cta_title: 'Cần tư vấn?', cta_description: 'Mô tả CTA', cta_primary_label: 'Liên hệ', cta_primary_url: '/lien-he', cta_secondary_label: 'Sản phẩm', cta_secondary_url: '/san-pham', cta_image_path: '/images/product-placeholder.svg', cta_image_alt: 'CTA' }, seo: { title: 'Bản tin LADYSTARS', description: 'Mô tả' }, articles: [] }
  let uploadedBody: Buffer | null = null
  await page.route('**/api/v1/admin/news-page', async (route) => route.fulfill({ json: { success: true, data: adminData } }))
  await page.route('**/api/v1/admin/news-page/cta-image', async (route) => {
    uploadedBody = route.request().postDataBuffer()
    return route.fulfill({ status: 201, json: { success: true, data: { cta_image_path: '/images/product-placeholder.svg', cta_image_alt: 'CTA' } } })
  })

  await page.goto('/admin/news/settings')
  await page.getByLabel('Chọn ảnh CTA bản tin').setInputFiles({ name: 'news-cta-source.png', mimeType: 'image/png', buffer: await sourceImage(page) })
  const dialog = page.getByRole('dialog', { name: 'Cắt ảnh CTA bản tin' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('tỷ lệ 4:3')
  await page.screenshot({ path: '../artifacts/admin-news-cta-crop.png', fullPage: true })
  await page.getByRole('button', { name: 'Dùng ảnh đã cắt' }).click()
  await expect(page.locator('.home-image-admin-preview.is-newsCta')).toBeVisible()
  await page.getByRole('button', { name: 'Lưu thiết lập' }).click()
  await expect(page.getByText('Đã lưu thiết lập trang bản tin.')).toBeVisible()
  expect(uploadedBody).not.toBeNull()
  expect(uploadedBody!.includes(Buffer.from('news-cta-source-cropped.webp'))).toBeTruthy()
  expect(uploadedBody!.includes(Buffer.from('image/webp'))).toBeTruthy()
})
