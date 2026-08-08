import { expect, test, type Page } from '@playwright/test'

const product = (id: number, name: string, category: { slug: string; name: string }) => ({ id, name, slug: `product-${id}`, base_sku: `SKU-${id}`, short_description: `Short description ${id}`, description: `Description ${id}`, status: 'active', is_featured: false, is_new: false, category, images: [], variants: [{ id, sku: `SKU-${id}`, price: 1200000 + id, sale_price: null, current_price: 1200000 + id, status: 'active', stock: 3, attributes: [] }], price_min: 1200000 + id, price_max: 1200000 + id, available_stock: 3, best_listing_variant: { id, current_price: 1200000 + id, stock: 3 }, rating_average: 0, reviews_count: 0 })
const guidePayload = {
  page_key: 'hair-guide', eyebrow: 'LADYSTARS GUIDE', title: 'Dịch vụ chăm sóc tóc phù hợp với bạn', subtitle: 'So sánh rõ ràng trước khi quyết định.', hero_image_alt: 'LADYSTARS guide', editorial_title: 'Các tiêu chí lựa chọn', editorial_intro: 'Thông tin giúp bạn cân nhắc theo nhu cầu thực tế.', editorial_sections: [{ title: 'Xác định nhu cầu', body: 'Bắt đầu từ vùng tóc cần quan tâm.' }, { title: 'Ưu tiên cảm giác', body: 'Cân nhắc độ nhẹ và độ thoáng.' }, { title: 'Chọn kiểu hoàn thiện', body: 'So sánh màu và chất liệu.' }, { title: 'Nhận tư vấn riêng', body: 'Trao đổi kỹ hơn trước khi quyết định.' }], consultation_title: 'Cần thêm một gợi ý phù hợp?', consultation_body: 'Đội ngũ LADYSTARS sẽ hỗ trợ bạn.', consultation_image_alt: 'Consultation', consultation_cta_label: 'Gửi yêu cầu tư vấn', settings: { hero_badge: 'Lựa chọn rõ ràng', trust_items: [{ title: 'Thông tin rõ ràng', description: 'Dữ liệu sản phẩm thực tế.' }, { title: 'Chọn theo nhu cầu', description: 'Theo thói quen sử dụng.' }, { title: 'Tư vấn tận tâm', description: 'Luôn sẵn sàng hỗ trợ.' }], guide_grid_title: 'Lựa chọn được gợi ý', guide_grid_intro: 'Sản phẩm theo đúng thứ tự admin đã chọn.', product_primary_cta_label: 'Xem chi tiết', product_secondary_cta_label: 'Nhận tư vấn', consultation_benefits: ['Gợi ý theo nhu cầu'] }, products: [{ product: product(2, 'Sản phẩm thứ hai', { slug: 'hair-system', name: 'Hair system' }), badge: 'Dùng hằng ngày', note: 'Gọn nhẹ, dễ so sánh.' }, { product: product(1, 'Sản phẩm đầu tiên', { slug: 'toupee', name: 'Toupee' }), badge: 'Tự nhiên', note: 'Phù hợp nhiều phong cách.' }], contact: { support_phone: null }, seo: { title: 'Dịch vụ chăm sóc tóc | LADYSTARS', description: 'Dịch vụ chăm sóc tóc phù hợp với nhu cầu của bạn.' },
}

async function mockPublicApi(page: Page, payload = guidePayload) {
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204 }))
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/auth/me')) return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false }) })
    if (path.endsWith('/hair-guide')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, message: '', data: payload }) })
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, message: '', data: {} }) })
  })
}

test('Hair Guide desktop renders selected product order and consultation safely', async ({ page }) => {
  await mockPublicApi(page)
  let consultationBody: Record<string, unknown> | undefined
  await page.route('**/api/v1/consultation-requests', async (route) => { consultationBody = route.request().postDataJSON() as Record<string, unknown>; await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: 1 } }) }) })
  await page.goto('/dich-vu-cham-soc')
  await expect(page).toHaveTitle('Dịch vụ chăm sóc tóc | LADYSTARS')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Dịch vụ chăm sóc tóc phù hợp')
  await expect(page.locator('.guide-card-title').evaluateAll((items) => items.map((item) => item.textContent))).resolves.toEqual(['Sản phẩm thứ hai', 'Sản phẩm đầu tiên'])
  await expect(page.getByRole('link', { name: /Xem chi tiết/ }).first()).toHaveAttribute('href', '/san-pham/product-2')
  await page.locator('.guide-card-actions').first().getByRole('button', { name: 'Nhận tư vấn' }).click()
  const dialog = page.getByRole('dialog', { name: 'Nhận tư vấn phù hợp' })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Họ và tên').fill('Khách Hair Guide')
  await dialog.getByLabel('Số điện thoại').fill('0900000000')
  await dialog.getByRole('button', { name: 'Gửi yêu cầu tư vấn' }).click()
  await expect.poll(() => consultationBody).toMatchObject({ product_id: 2, source_page: '/dich-vu-cham-soc' })
  await expect(dialog).toBeHidden()
  await page.screenshot({ path: '../artifacts/hair-guide-desktop.png', fullPage: true })
})

test('Hair Guide mobile has no overflow, keyboard dialog and header menu', async ({ page }) => {
  await mockPublicApi(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/dich-vu-cham-soc')
  await page.getByRole('button', { name: 'Mở menu' }).click()
  await page.getByRole('button', { name: 'Sản phẩm & dịch vụ' }).click()
  await expect(page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Dịch vụ chăm sóc tóc', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Mở menu' }).click()
  await page.locator('.guide-hero-actions').getByRole('button', { name: 'Nhận tư vấn' }).click()
  const dialog = page.getByRole('dialog', { name: 'Nhận tư vấn phù hợp' })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).resolves.toBe(true)
  await page.screenshot({ path: '../artifacts/hair-guide-mobile.png', fullPage: true })
})

test('Hair Guide shows its public empty state', async ({ page }) => {
  await mockPublicApi(page, { ...guidePayload, products: [] })
  await page.goto('/dich-vu-cham-soc')
  await expect(page.getByRole('heading', { name: 'Chưa có sản phẩm phù hợp' })).toBeVisible()
})

test('Hair Guide admin selector and product picker render without database writes', async ({ page }) => {
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204 }))
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/auth/me')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: 1, name: 'Admin', email: 'admin@example.test', role: 'admin', status: 'active' } }) })
    if (path.endsWith('/cart')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { items: [], subtotal: 0, count: 0 } }) })
    const content = { ...guidePayload, settings_json: { hero_badge: guidePayload.settings.hero_badge, trust_items: guidePayload.settings.trust_items, guide_grid_title: guidePayload.settings.guide_grid_title, guide_grid_intro: guidePayload.settings.guide_grid_intro, guide_products: guidePayload.products.map((item) => ({ product_id: item.product.id, badge: item.badge, note: item.note })), product_primary_cta_label: guidePayload.settings.product_primary_cta_label, product_secondary_cta_label: guidePayload.settings.product_secondary_cta_label, consultation_benefits: guidePayload.settings.consultation_benefits }, editorial_sections_json: guidePayload.editorial_sections }
    const data = path.endsWith('/admin/catalog/content') ? { categories: [], products: guidePayload.products.map((item) => ({ id: item.product.id, name: item.product.name, base_sku: item.product.base_sku, category: item.product.category, status: 'active', image_path: null })) } : path.endsWith('/hair-guide') ? content : { ...content, page_key: 'products' }
    return path.includes('/admin/catalog/content') ? route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, message: '', data }) }) : route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, message: '', data: {} }) })
  })
  await page.goto('/admin/catalog-content')
  await page.getByLabel('Trang cần chỉnh').selectOption('hair-guide')
  await expect(page.getByRole('heading', { name: 'Nội dung Dịch vụ chăm sóc tóc' })).toBeVisible()
  await expect(page.getByText('Danh sách sản phẩm hướng dẫn')).toBeVisible()
  await expect(page.getByText('Sản phẩm thứ hai')).toBeVisible()
  await page.screenshot({ path: '../artifacts/hair-guide-admin.png', fullPage: true })
})

test('legacy hair guide URL redirects to hair care service', async ({ page }) => {
  await mockPublicApi(page)
  await page.goto('/huong-dan-chon-toc')
  await expect(page).toHaveURL('/dich-vu-cham-soc')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Dịch vụ chăm sóc tóc phù hợp')
})

test('news guide menu opens its own blank guide page', async ({ page }) => {
  await mockPublicApi(page)
  await page.goto('/dich-vu-cham-soc')
  await page.getByRole('button', { name: 'Tin tức & ưu đãi' }).click()
  await page.getByRole('link', { name: 'Hướng dẫn', exact: true }).click()
  await expect(page).toHaveURL('/huong-dan')
  await expect(page.getByRole('heading', { name: 'Hướng dẫn', level: 1 })).toBeVisible()
})
