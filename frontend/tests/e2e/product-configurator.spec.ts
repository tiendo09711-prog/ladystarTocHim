import { expect, test } from '@playwright/test'

const option = (id: number, display_value: string, option_code: string) => ({ id, value: display_value.toLowerCase(), display_value, option_code, description: 'Mô tả ' + display_value, color_code: '#382a25', image_path: null, image_alt: null })
const attributes = [
  { id: 1, code: 'base_size', name: 'Size tóc', display_style: 'buttons', sort_order: 10, values: [option(11, 'S(2*18cm)', 'S'), option(12, 'M(4*18cm)', 'M')] },
  { id: 2, code: 'color', name: 'Màu sắc', display_style: 'image_swatches', sort_order: 20, values: [option(21, 'Nâu đen', 'ND'), option(22, 'Đen tự nhiên', 'DT')] },
  { id: 3, code: 'base_type', name: 'Đế tóc', display_style: 'image_cards', sort_order: 30, values: [option(31, 'Da đầu loại 1', 'D8'), option(32, 'Đế lace', 'L1')] },
]
const variant = (id: number, sku: string, price: number, values: number[], stock = 4) => ({ id, sku, barcode: null, price, sale_price: null, current_price: price, status: 'active', stock, attributes: values.map((valueId, index) => ({ attribute_id: index + 1, attribute_code: attributes[index].code, attribute_name: attributes[index].name, value_id: valueId, value: attributes[index].values.find((value) => value.id === valueId)?.display_value, option_code: attributes[index].values.find((value) => value.id === valueId)?.option_code })) })
const product = { id: 9, name: 'Hair System Configurator', slug: 'hair-system-configurator', base_sku: 'HS-CFG', short_description: 'Sản phẩm cấu hình theo nhu cầu.', description: 'Thông tin chi tiết sản phẩm.', material: 'Tóc thật', base_type: 'Lace', origin: 'Việt Nam', estimated_lifespan: '6-12 tháng', usage_instructions: 'Căn chỉnh và cố định.', care_instructions: 'Vệ sinh định kỳ.', warranty_information: 'Bảo hành kỹ thuật.', status: 'active', is_featured: true, is_new: true, category: { id: 1, name: 'Hair system', slug: 'hair-system', is_active: true }, brand: { id: 1, name: 'LADYSTARS', slug: 'ladystars' }, images: [{ id: 1, product_variant_id: null, image_path: '/images/product-placeholder.svg', alt_text: 'Ảnh chung', is_primary: true, sort_order: 0 }, { id: 2, product_variant_id: 91, image_path: '/images/brand/ladystars-hero.svg', alt_text: 'Ảnh variant', is_primary: false, sort_order: 1 }], variants: [variant(91, 'HS-S-ND-D8', 4500000, [11, 21, 31]), variant(92, 'HS-M-DT-L1', 5200000, [12, 22, 32])], variant_options: attributes, price_min: 4500000, price_max: 5200000, available_stock: 8, rating_average: 4.8, reviews_count: 1, sold_count: 14, reviews: [{ id: 1, rating: 5, title: 'Rất tự nhiên', content: 'Sản phẩm phù hợp.', created_at: '2026-08-01T00:00:00Z', reviewer_name: 'Khách hàng' }] }

async function mockApi(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/products/' + product.slug)) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: product }) })
    if (url.pathname.endsWith('/products')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { data: [], meta: {}, links: {} } }) })
    if (url.pathname.endsWith('/guest-checkout/preview')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { subtotal: 4500000, discount_amount: 0, shipping_fee: 0, total_amount: 4500000 } }) })
    if (url.pathname.endsWith('/guest-checkout/place-order')) return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: 1, order_number: 'LS-TEST-001', items: [] } }) })
    if (url.pathname.endsWith('/store-page')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { branches: [{ id: 1, phone: '0900000000', is_default: true }], content: null } }) })
    if (url.pathname.endsWith('/consultation-requests')) return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: 1 } }) })
    return route.continue()
  })
}

test('product configurator resolves exact variant, resets and opens consultation', async ({ page }) => {
  await mockApi(page)
  await page.goto('/san-pham/' + product.slug)
  await expect(page.getByText('MÃ SẢN PHẨM: HS-CFG')).toBeVisible()
  await expect(page.getByText('Từ 4.500.000')).toBeVisible()
  await page.getByRole('button', { name: 'S(2*18cm)' }).click()
  await page.getByRole('button', { name: 'Nâu đen' }).click()
  await expect(page.getByRole('button', { name: 'Đế lace' })).toBeDisabled()
  await page.getByRole('button', { name: 'Da đầu loại 1' }).click()
  await expect(page.getByText('SKU: HS-S-ND-D8')).toBeVisible()
  await expect(page.getByText('4.500.000')).toBeVisible()
  await expect(page.locator('.product-gallery-main img')).toHaveAttribute('src', '/images/brand/ladystars-hero.svg')
  await page.getByRole('button', { name: 'Xem ảnh 2' }).click()
  await expect(page.locator('.product-gallery-main img')).toHaveAttribute('src', '/images/product-placeholder.svg')
  await page.screenshot({ path: '../artifacts/product-detail-desktop.png', fullPage: true })
  await page.getByRole('button', { name: 'Chọn lại' }).click()
  await expect(page.getByText('MÃ SẢN PHẨM: HS-CFG')).toBeVisible()
  await page.getByRole('button', { name: 'ĐẶT LỊCH TƯ VẤN', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await page.getByRole('tab', { name: 'HƯỚNG DẪN SỬ DỤNG' }).click()
  await expect(page.getByText('Căn chỉnh và cố định.')).toBeVisible()
})

test('guest buy now goes directly to checkout and places order', async ({ page }) => {
  await mockApi(page)
  await page.goto('/san-pham/' + product.slug)
  await page.getByRole('button', { name: 'S(2*18cm)' }).click()
  await page.getByRole('button', { name: 'Nâu đen' }).click()
  await page.getByRole('button', { name: 'Da đầu loại 1' }).click()
  await page.getByRole('button', { name: 'ĐẶT MUA NGAY' }).click()
  await expect(page).toHaveURL('/thanh-toan')
  await expect(page.getByText('Size tóc: S(2*18cm)')).toBeVisible()
  await page.getByLabel('Người nhận').fill('Nguyễn Văn A')
  await page.getByLabel('Số điện thoại').fill('0900000000')
  await page.getByLabel('Email').fill('guest@example.com')
  await page.getByLabel('Tỉnh / thành phố').fill('TP. Hồ Chí Minh')
  await page.getByLabel('Quận / huyện').fill('Quận 1')
  await page.getByLabel('Phường / xã').fill('Bến Nghé')
  await page.getByLabel('Địa chỉ cụ thể').fill('10 Nguyễn Huệ')
  await page.getByRole('button', { name: 'THANH TOÁN' }).click()
  await expect(page).toHaveURL('/dat-hang-thanh-cong/LS-TEST-001')
})

test('mobile product detail has no horizontal overflow', async ({ page }) => {
  await mockApi(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/san-pham/' + product.slug)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  expect(overflow).toBe(false)
  await page.screenshot({ path: '../artifacts/product-detail-mobile.png', fullPage: true })
})
