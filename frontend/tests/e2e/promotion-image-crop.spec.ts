import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 90_000 })

async function loginAdmin(page: import('@playwright/test').Page) {
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill('admin@namhair.local')
  await page.getByLabel('Mật khẩu').fill('Admin@123456')
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

const productOptions = [{ id: 1, name: 'Sản phẩm crop', slug: 'san-pham-crop', base_sku: 'CROP-001', image_path: '/images/product-placeholder.svg' }]

test('admin crop ảnh bìa ưu đãi 16:9 và upload WebP', async ({ page }) => {
  await loginAdmin(page)
  let uploadedBody: Buffer | null = null

  await page.route('**/api/v1/admin/promotions/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/promotions/product-options')) return route.fulfill({ json: { success: true, data: productOptions } })
    if (path.endsWith('/promotions/71/cover-image')) {
      uploadedBody = route.request().postDataBuffer()
      return route.fulfill({ status: 201, json: { success: true, data: { id: 71, cover_image_path: '/images/product-placeholder.svg' } } })
    }
    return route.continue()
  })
  await page.route('**/api/v1/admin/promotions', async (route) => {
    if (route.request().method() === 'POST') return route.fulfill({ status: 201, json: { success: true, data: { id: 71, title: 'Ưu đãi crop', slug: 'uu-dai-crop', status: 'draft' } } })
    return route.fulfill({ json: { success: true, data: { current_page: 1, data: [], last_page: 1, per_page: 15, total: 0 } } })
  })

  await page.goto('/admin/promotions/create')
  await page.getByLabel('Tiêu đề').fill('Ưu đãi crop')
  await page.getByRole('textbox', { name: 'Nội dung', exact: true }).fill('Nội dung crop')
  await page.getByLabel('Chọn ảnh bìa ưu đãi').setInputFiles({ name: 'promotion-cover-source.png', mimeType: 'image/png', buffer: await sourceImage(page) })
  const dialog = page.getByRole('dialog', { name: 'Cắt ảnh bìa ưu đãi' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('tỷ lệ 16:9')
  await page.getByLabel('Căn dọc ảnh bìa ưu đãi').fill('0.4')
  await page.getByRole('button', { name: 'Dùng ảnh đã cắt' }).click()
  const preview = page.locator('.promotion-admin-cover')
  await expect(preview).toBeVisible()
  const ratio = await preview.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    return bounds.width / bounds.height
  })
  expect(ratio).toBeCloseTo(16 / 9, 2)
  await page.getByRole('button', { name: 'Lưu nháp' }).click()
  await expect(page).toHaveURL(/admin\/promotions$/)
  expect(uploadedBody).not.toBeNull()
  expect(uploadedBody!.includes(Buffer.from('promotion-cover-source-cropped.webp'))).toBeTruthy()
  expect(uploadedBody!.includes(Buffer.from('image/webp'))).toBeTruthy()
})

test('admin crop ảnh CTA ưu đãi 4:3 và upload WebP', async ({ page }) => {
  await loginAdmin(page)
  const adminData = {
    content: { eyebrow: 'ƯU ĐÃI', title: 'Ưu đãi', description: 'Mô tả', featured_article_id: null, featured_badge_label: 'Nổi bật', list_eyebrow: 'MỚI', list_title: 'Ưu đãi mới', list_description: 'Mô tả', show_cta: true, cta_eyebrow: 'CTA', cta_title: 'Cần tư vấn?', cta_description: 'Mô tả CTA', cta_primary_label: 'Liên hệ', cta_primary_url: '/lien-he', cta_secondary_label: 'Sản phẩm', cta_secondary_url: '/san-pham', cta_image_path: '/images/product-placeholder.svg', cta_image_alt: 'CTA' },
    seo: { title: 'Ưu đãi', description: 'Mô tả' },
    articles: [],
  }
  let uploadedBody: Buffer | null = null
  await page.route('**/api/v1/admin/promotions-page', async (route) => {
    if (route.request().method() === 'PUT') return route.fulfill({ json: { success: true, data: adminData } })
    return route.fulfill({ json: { success: true, data: adminData } })
  })
  await page.route('**/api/v1/admin/promotions-page/cta-image', async (route) => {
    uploadedBody = route.request().postDataBuffer()
    return route.fulfill({ status: 201, json: { success: true, data: { cta_image_path: '/images/product-placeholder.svg', cta_image_alt: 'CTA' } } })
  })

  await page.goto('/admin/promotions/settings')
  await page.getByLabel('Chọn ảnh CTA ưu đãi').setInputFiles({ name: 'promotion-cta-source.png', mimeType: 'image/png', buffer: await sourceImage(page) })
  const dialog = page.getByRole('dialog', { name: 'Cắt ảnh CTA ưu đãi' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('tỷ lệ 4:3')
  await page.getByLabel('Căn dọc ảnh CTA ưu đãi').fill('-0.35')
  await page.getByRole('button', { name: 'Dùng ảnh đã cắt' }).click()
  const preview = page.locator('.promotion-admin-cta')
  await expect(preview).toBeVisible()
  const ratio = await preview.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    return bounds.width / bounds.height
  })
  expect(ratio).toBeCloseTo(4 / 3, 2)
  await page.getByRole('button', { name: 'Lưu thiết lập' }).click()
  await expect(page.getByText('Đã lưu thiết lập trang ưu đãi.')).toBeVisible()
  expect(uploadedBody).not.toBeNull()
  expect(uploadedBody!.includes(Buffer.from('promotion-cta-source-cropped.webp'))).toBeTruthy()
  expect(uploadedBody!.includes(Buffer.from('image/webp'))).toBeTruthy()
})
