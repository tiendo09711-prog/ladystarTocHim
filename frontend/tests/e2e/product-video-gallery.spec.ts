import { expect, test } from '@playwright/test'

const images = [
  { id: 2, product_variant_id: null, image_path: '/images/brand/ladystars-hero.svg', alt_text: 'Ảnh thứ hai', is_primary: false, sort_order: 1 },
  { id: 1, product_variant_id: null, image_path: '/images/product-placeholder.svg', alt_text: 'Ảnh chính', is_primary: true, sort_order: 0 },
]
const product = {
  id: 901, name: 'Sản phẩm có video', slug: 'san-pham-co-video', base_sku: 'VIDEO-001', short_description: 'Kiểm tra gallery.', description: 'Mô tả sản phẩm.',
  video_path: '/test-product.mp4', status: 'active', is_featured: false, is_new: true, category: { id: 1, name: 'Tóc giả nam', slug: 'toc-gia-nam', is_active: true }, brand: null,
  images, variants: [{ id: 1, sku: 'VIDEO-001-A', barcode: null, price: 1000000, sale_price: null, current_price: 1000000, status: 'active', stock: 1, attributes: [] }],
  variant_options: [], price_min: 1000000, price_max: 1000000, available_stock: 1, rating_average: 0, reviews_count: 0, sold_count: 0, reviews: [], promotions: [],
}

async function mockProduct(page: import('@playwright/test').Page, withVideo = true) {
  await page.route('**/api/v1/products/**', async (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { ...product, slug: withVideo ? product.slug : 'san-pham-khong-video', video_path: withVideo ? product.video_path : null } }) }))
  await page.route('**/test-product.mp4', async (route) => route.fulfill({ status: 200, contentType: 'video/mp4', body: Buffer.alloc(32) }))
}

test('gallery phát video trước và chuyển đúng media theo thao tác', async ({ page }) => {
  await mockProduct(page)
  await page.goto('/san-pham/' + product.slug)
  const video = page.locator('.product-gallery-main video')
  await expect(video).toBeVisible()
  await expect(video).toHaveJSProperty('autoplay', true)
  await expect(video).toHaveJSProperty('muted', true)
  await expect(video).toHaveJSProperty('playsInline', true)

  await video.dispatchEvent('ended')
  await expect(page.locator('.product-gallery-main img')).toHaveAttribute('src', '/images/product-placeholder.svg')
  await page.getByRole('button', { name: 'Xem ảnh 2' }).click()
  await expect(page.locator('.product-gallery-main img')).toHaveAttribute('src', '/images/brand/ladystars-hero.svg')
  await page.getByRole('button', { name: 'Xem video sản phẩm' }).click()
  await expect(page.locator('.product-gallery-main video')).toBeVisible()
})

test('gallery không video hiển thị ảnh chính và không tràn mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockProduct(page, false)
  await page.goto('/san-pham/san-pham-khong-video')
  await expect(page.locator('.product-gallery-main img')).toHaveAttribute('src', '/images/product-placeholder.svg')
  await expect(page.getByRole('button', { name: 'Xem video sản phẩm' })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
  await page.screenshot({ path: '../artifacts/product-video-mobile.png', fullPage: true })
})
