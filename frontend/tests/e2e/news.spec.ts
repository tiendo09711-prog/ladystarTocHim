import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 60_000 })

test('trang bản tin hiển thị heading, breadcrumb và không tràn ngang', async ({ page }) => {
  await page.goto('/tin-tuc')
  await expect(page).toHaveTitle(/Bản tin LADYSTARS/)
  await expect(page.getByRole('heading', { name: 'Bản tin LADYSTARS' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})

test('trang bản tin mobile hiển thị state hợp lệ và không tràn ngang', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/tin-tuc')
  await expect(page.getByRole('heading', { name: 'Bản tin LADYSTARS' })).toBeVisible()
  await expect.poll(async () => {
    const featured = await page.locator('.news-featured-card').count()
    const cards = await page.locator('.news-card').count()
    const empty = await page.getByText('Chưa có bài viết').count()
    return featured > 0 || cards > 0 || empty > 0
  }, { timeout: 15_000 }).toBeTruthy()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})

test('bài viết nổi bật mở được trang chi tiết khi có dữ liệu', async ({ page }) => {
  await page.goto('/tin-tuc')
  const featured = page.locator('.news-featured-card')
  test.skip(await featured.count() === 0, 'Chưa có bài viết published để kiểm tra detail')
  const title = await featured.locator('h2').innerText()
  await featured.click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText(title)
  await expect(page.getByRole('link', { name: /Quay lại bản tin/ })).toBeVisible()
})

test('slug không tồn tại hiển thị trang 404', async ({ page }) => {
  await page.goto('/tin-tuc/bai-viet-khong-ton-tai-e2e')
  await expect(page.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible()
})

async function mockNewsPage(page: import('@playwright/test').Page) {
  const articles = Array.from({ length: 9 }, (_, index) => ({ id: index + 10, title: `Bài viết ${index + 1}`, slug: `bai-viet-${index + 1}`, excerpt: 'Nội dung ngắn để kiểm tra bố cục card bài viết.', cover_image_path: index === 0 ? null : '/images/product-placeholder.svg', cover_image_alt: null, category: index % 2 ? 'Cẩm nang' : null, published_at: '2026-08-01T00:00:00.000000Z' }))
  await page.route('**/api/v1/news-page**', async (route) => {
    const currentPage = Number(new URL(route.request().url()).searchParams.get('page') ?? '1')
    await route.fulfill({ json: { success: true, message: 'ok', data: { content: { eyebrow: 'TIN TỨC & CẨM NANG', title: 'Bản tin LADYSTARS', description: 'Mô tả bản tin.', featured_badge_label: 'Bài viết nổi bật', list_eyebrow: 'KHÁM PHÁ LADYSTARS', list_title: 'Bài viết mới nhất', list_description: 'Mô tả danh sách.', show_cta: true, cta_eyebrow: 'ĐỒNG HÀNH CÙNG LADYSTARS', cta_title: 'Cần tư vấn riêng?', cta_description: 'Đội ngũ luôn sẵn sàng hỗ trợ.', cta_primary_label: 'Liên hệ', cta_primary_url: '/lien-he', cta_secondary_label: 'Sản phẩm', cta_secondary_url: '/san-pham', cta_image_path: null, cta_image_alt: null }, seo: { title: 'Bản tin LADYSTARS', description: 'Mô tả bản tin.' }, featured: { id: 1, title: 'Bài viết nổi bật mẫu', slug: 'bai-viet-noi-bat', excerpt: 'Bài viết được chọn để kiểm tra responsive.', cover_image_path: null, cover_image_alt: null, category: 'Câu chuyện', published_at: '2026-08-02T00:00:00.000000Z' }, articles: { current_page: currentPage, data: articles, last_page: 2, per_page: 9, total: 18 } } } })
  })
}

test('lưới bản tin đáp ứng desktop, tablet, mobile và pagination', async ({ page }) => {
  await mockNewsPage(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/tin-tuc')
  await expect(page.locator('.news-featured-card')).toBeVisible()
  await expect(page.locator('.news-card')).toHaveCount(9)
  await expect(page.locator('.news-grid')).toHaveCSS('grid-template-columns', /repeat\(3|(?:[\d.]+px\s+){2}/)

  await page.setViewportSize({ width: 768, height: 1024 })
  await expect(page.locator('.news-grid')).toHaveCSS('grid-template-columns', /repeat\(2|[\d.]+px\s+[\d.]+px/)

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.news-grid')).toHaveCSS('grid-template-columns', /[\d.]+px/)
  const featured = await page.locator('.news-featured-card').boundingBox()
  expect(featured).not.toBeNull()
  expect(Math.abs((featured?.width ?? 0) - (featured?.height ?? 0))).toBeLessThan(8)
  await page.getByRole('button', { name: '2' }).click()
  await expect(page).toHaveURL(/\?page=2/)
  await expect(page.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})
