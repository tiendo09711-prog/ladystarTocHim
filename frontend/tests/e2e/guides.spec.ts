import { expect, test, type Page } from '@playwright/test'

test.describe.configure({ timeout: 90_000 })

const article = (id: number) => ({ id, title: `Hướng dẫn chăm sóc số ${id}`, slug: `huong-dan-${id}`, excerpt: 'Nội dung tóm tắt được tạo riêng để kiểm tra bố cục trang hướng dẫn.', cover_image_path: null, cover_image_alt: null, category: 'Hướng dẫn', published_at: '2026-08-08T00:00:00.000000Z' })

async function mockGuides(page: Page) {
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204 }))
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ status: 401, json: { success: false, message: 'Unauthenticated.' } }))
  await page.route('**/api/v1/cart', (route) => route.fulfill({ json: { success: true, data: { items: [], subtotal: 0, count: 0 } } }))
  await page.route('**/api/v1/guides-page**', async (route) => {
    const currentPage = Number(new URL(route.request().url()).searchParams.get('page') || 1)
    await route.fulfill({ json: { success: true, message: 'ok', data: { content: { eyebrow: 'CẨM NANG LADYSTARS', title: 'Hướng dẫn chăm sóc và tạo kiểu', description: 'Những chia sẻ thực tế giúp bạn chăm sóc mái tóc nhẹ nhàng và tự tin hơn mỗi ngày.', hero_image_path: null, hero_image_alt: null, featured_badge_label: 'Hướng dẫn nổi bật', list_eyebrow: 'KIẾN THỨC HỮU ÍCH', list_title: 'Khám phá các bài hướng dẫn', list_description: 'Nội dung được quản trị hoàn toàn từ cơ sở dữ liệu.', show_cta: false }, seo: { title: 'Hướng dẫn | LADYSTARS', description: 'Cẩm nang LADYSTARS' }, featured: article(99), articles: { current_page: currentPage, data: Array.from({ length: 9 }, (_, index) => article(index + 1)), last_page: 2, per_page: 9, total: 18 } } } })
  })
}

async function mockAdminSession(page: Page) {
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204 }))
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: { success: true, data: { id: 1, name: 'Admin', email: 'admin@example.test', role: 'admin', status: 'active' } } }))
  await page.route('**/api/v1/cart', (route) => route.fulfill({ json: { success: true, data: { items: [], subtotal: 0, count: 0 } } }))
}

test('trang hướng dẫn desktop đúng bố cục và phân trang', async ({ page }) => {
  await mockGuides(page)
  await page.goto('/huong-dan')
  await expect(page.getByRole('heading', { name: 'Hướng dẫn chăm sóc và tạo kiểu' })).toBeVisible()
  await expect(page.locator('.guide-featured')).toBeVisible()
  await expect(page.locator('.guide-card')).toHaveCount(9)
  await page.screenshot({ path: '../artifacts/guides-desktop.png', fullPage: true })
  await page.getByRole('button', { name: '2' }).click()
  await expect(page).toHaveURL(/page=2/)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
})

test('trang hướng dẫn mobile không tràn ngang', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockGuides(page)
  await page.goto('/huong-dan')
  await expect(page.locator('.guide-featured')).toBeVisible()
  await expect(page.locator('.guide-card')).toHaveCount(9)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
  await page.screenshot({ path: '../artifacts/guides-mobile.png', fullPage: true })
})

test('admin tạo, xuất bản và xóa bài hướng dẫn', async ({ page }) => {
  await mockAdminSession(page)
  const suffix = Date.now().toString().slice(-7)
  const title = `Hướng dẫn E2E ${suffix}`
  const slug = `huong-dan-e2e-${suffix}`
  let savedArticle: ReturnType<typeof article> & { status: 'published'; content: string } | null = null
  await page.route('**/api/v1/admin/guides**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/501') && route.request().method() === 'DELETE') {
      savedArticle = null
      return route.fulfill({ json: { success: true, message: 'Đã xóa bài hướng dẫn.', data: null } })
    }
    if (path.endsWith('/guides') && route.request().method() === 'POST') {
      savedArticle = { ...article(501), title, slug, status: 'published', content: 'Nội dung bài hướng dẫn E2E đầy đủ.' }
      return route.fulfill({ status: 201, json: { success: true, data: savedArticle } })
    }
    const data = savedArticle ? [savedArticle] : []
    return route.fulfill({ json: { success: true, data: { current_page: 1, data, last_page: 1, per_page: 15, total: data.length } } })
  })
  await page.route('**/api/v1/guides-page**', (route) => {
    const data = savedArticle ? [savedArticle] : []
    return route.fulfill({ json: { success: true, data: { content: { title: 'Hướng dẫn', show_cta: false }, seo: {}, featured: savedArticle, articles: { current_page: 1, data, last_page: 1, per_page: 9, total: data.length } } } })
  })
  await page.goto('/admin/guides/create')
  await page.getByLabel('Tiêu đề', { exact: true }).fill(title)
  await page.getByLabel('Slug').fill(slug)
  await page.getByLabel('Tóm tắt').fill('Tóm tắt bài hướng dẫn được tạo từ trang quản trị.')
  await page.getByRole('textbox', { name: 'Nội dung (mỗi đoạn cách nhau một dòng trống)' }).fill('Nội dung bài hướng dẫn E2E đầy đủ.')
  await page.getByRole('button', { name: 'Xuất bản' }).click()
  await expect(page).toHaveURL(/admin\/guides$/)
  await expect(page.getByText(title)).toBeVisible()
  await page.goto('/huong-dan')
  await expect(page.locator('.guide-card h3')).toHaveText(title)
  await page.goto('/admin/guides')
  await page.getByPlaceholder('Tìm theo tiêu đề hoặc slug').fill(title)
  await page.getByRole('button', { name: 'Tìm' }).click()
  const row = page.getByRole('row').filter({ hasText: title })
  await expect(row).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await row.getByRole('button', { name: `Xóa ${title}` }).click()
  await expect(page.getByText('Đã xóa bài hướng dẫn.')).toBeVisible()
})

test('admin chỉnh thiết lập trang hướng dẫn và khôi phục', async ({ page }) => {
  await mockAdminSession(page)
  const originalTitle = 'Hướng dẫn chăm sóc và tạo kiểu'
  let currentTitle = originalTitle
  const adminPayload = () => ({ content: { title: currentTitle, description: 'Mô tả', featured_article_id: null, show_cta: false }, seo: { title: 'Hướng dẫn | LADYSTARS', description: 'Mô tả' }, articles: [] })
  await page.route('**/api/v1/admin/guides-page', (route) => {
    if (route.request().method() === 'PUT') currentTitle = String(route.request().postDataJSON().title)
    return route.fulfill({ json: { success: true, data: adminPayload() } })
  })
  await page.route('**/api/v1/guides-page**', (route) => route.fulfill({ json: { success: true, data: { content: { title: currentTitle, show_cta: false }, seo: {}, featured: null, articles: { current_page: 1, data: [], last_page: 1, per_page: 9, total: 0 } } } }))
  await page.goto('/admin/guides/settings')
  const titleInput = page.getByLabel('Tiêu đề trang')
  const updatedTitle = `${originalTitle || 'Hướng dẫn'} E2E`
  await titleInput.fill(updatedTitle)
  await page.getByRole('button', { name: 'Lưu thiết lập' }).click()
  await expect(page.getByText('Đã lưu thiết lập trang hướng dẫn.')).toBeVisible()
  await page.goto('/huong-dan')
  await expect(page.locator('.guide-journal-hero h1')).toHaveText(updatedTitle)
  await page.goto('/admin/guides/settings')
  await page.getByLabel('Tiêu đề trang').fill(originalTitle)
  const restored = page.waitForResponse((response) => response.request().method() === 'PUT' && response.url().endsWith('/api/v1/admin/guides-page'))
  await page.getByRole('button', { name: 'Lưu thiết lập' }).click()
  expect((await restored).ok()).toBe(true)
})
