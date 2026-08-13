import { expect, test } from '@playwright/test'

const categories = [
  { id: 11, name: 'Phụ kiện tóc giả', slug: 'phu-kien-toc-gia' },
  { id: 12, name: 'Dung dịch vệ sinh', slug: 'dung-dich-ve-sinh' },
]

const products = [{ id: 1, name: 'Sản phẩm kiểm tra', base_sku: 'SP-001', category: categories[0], status: 'active', image_path: '/images/product-placeholder.svg' }]

function content(pageKey: string) {
  return {
    page_key: pageKey,
    eyebrow: 'LADYSTARS',
    title: pageKey === 'hair-guide' ? 'Dịch vụ chăm sóc tóc' : 'Sản phẩm LADYSTARS',
    subtitle: 'Nội dung kiểm tra crop ảnh.',
    hero_image_path: '/images/product-placeholder.svg',
    hero_image_alt: 'Hero',
    editorial_title: 'Thông tin lựa chọn',
    editorial_intro: 'Nội dung giới thiệu.',
    editorial_sections_json: pageKey === 'hair-guide' ? Array.from({ length: 4 }, (_, index) => ({ title: `Mục ${index + 1}`, body: 'Nội dung' })) : [],
    consultation_title: 'Nhận tư vấn',
    consultation_body: 'Đội ngũ hỗ trợ.',
    consultation_image_path: '/images/product-placeholder.svg',
    consultation_image_alt: 'Tư vấn',
    consultation_cta_label: 'Gửi yêu cầu',
    settings_json: { trust_items: [], guide_products: [], consultation_benefits: [] },
    seo: { title: 'LADYSTARS', description: null },
    is_active: true,
  }
}

async function loginAdmin(page: import('@playwright/test').Page) {
  await page.goto('/admin/login')
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).toHaveURL(/admin\/dashboard/, { timeout: 20_000 })
}

test('admin catalog crop Hero và Tư vấn cho mọi trang sản phẩm', async ({ page }) => {
  await loginAdmin(page)
  let activePageKey = 'products'
  let uploadedBody: Buffer | null = null
  await page.route('**/api/v1/admin/catalog/content', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { categories, products, contents: [] } }) }))
  await page.route('**/api/v1/admin/catalog/content/**', async (route) => {
    const url = new URL(route.request().url())
    const match = url.pathname.match(/admin\/catalog\/content\/([^/]+)$/)
    if (match && route.request().method() === 'GET') {
      activePageKey = match[1]
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: content(activePageKey) }) })
    }
    if (url.pathname.endsWith('/images')) { uploadedBody = route.request().postDataBuffer(); return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) }) }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: content(activePageKey) }) })
  })

  await page.goto('/admin/catalog-content')
  const imageBase64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 900
    canvas.height = 1500
    const context = canvas.getContext('2d')!
    context.fillStyle = '#7f3f52'
    context.fillRect(0, 0, 900, 750)
    context.fillStyle = '#efc2cc'
    context.fillRect(0, 750, 900, 750)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  const imageFile = { name: 'catalog-source.png', mimeType: 'image/png', buffer: Buffer.from(imageBase64, 'base64') }
  const pages = [
    { value: 'products', label: 'Trang tổng /san-pham' },
    { value: 'category-11', label: 'Danh mục: Phụ kiện tóc giả' },
    { value: 'category-12', label: 'Danh mục: Dung dịch vệ sinh' },
    { value: 'hair-guide', label: 'Dịch vụ chăm sóc tóc — /dich-vu-cham-soc' },
  ]

  for (const target of pages) {
    await page.getByLabel('Trang cần chỉnh').selectOption(target.value)
    await expect(page.getByLabel('Trang cần chỉnh')).toHaveValue(target.value)
    for (const slot of ['Hero', 'Tư vấn']) {
      const title = `${slot} ${target.value === 'hair-guide' ? 'Dịch vụ chăm sóc' : 'Catalog'}`
      await page.getByLabel(`Chọn ảnh ${title}`).setInputFiles(imageFile)
      const dialog = page.getByRole('dialog', { name: `Cắt ảnh ${title}` })
      await expect(dialog).toBeVisible()
      await expect(dialog).toContainText('tỷ lệ 6:5')
      if (target.value === 'products' && slot === 'Hero') {
        await page.getByLabel(`Căn ngang ảnh ${title}`).fill('0.25')
        await page.getByRole('button', { name: 'Dùng ảnh đã cắt' }).click()
        await expect(page.getByText('Đã cập nhật ảnh Hero.')).toBeVisible()
        expect(uploadedBody).not.toBeNull()
        expect(uploadedBody!.includes(Buffer.from('catalog-source-cropped.webp'))).toBeTruthy()
        expect(uploadedBody!.includes(Buffer.from('image/webp'))).toBeTruthy()
      } else {
        await page.getByRole('button', { name: 'Đóng trình cắt ảnh' }).click()
      }
    }
  }
  await page.screenshot({ path: '../artifacts/catalog-admin-crop.png', fullPage: true })
})

test('admin sản phẩm crop mọi ảnh theo khung 1:1', async ({ page }) => {
  await loginAdmin(page)
  await page.route('**/api/v1/categories', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: categories }) }))
  await page.route('**/api/v1/brands', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) }))
  await page.route('**/api/v1/admin/attributes', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) }))
  await page.goto('/admin/products/create')
  const imageBase64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1200
    canvas.height = 700
    canvas.getContext('2d')!.fillRect(0, 0, 1200, 700)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  await page.getByLabel('Chọn và cắt ảnh').setInputFiles({ name: 'product-source.png', mimeType: 'image/png', buffer: Buffer.from(imageBase64, 'base64') })
  const dialog = page.getByRole('dialog', { name: 'Cắt ảnh sản phẩm 1' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('tỷ lệ 1:1')
})
