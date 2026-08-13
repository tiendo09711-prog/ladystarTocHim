import { expect, test, type Page } from '@playwright/test'

async function mockAdminAuth(page: Page) {
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204 }))
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: { success: true, data: { id: 1, name: 'Admin', email: 'admin@example.test', role: 'admin', status: 'active' } } }))
  await page.route('**/api/v1/cart', (route) => route.fulfill({ json: { success: true, data: { items: [], subtotal: 0, count: 0 } } }))
}

async function mockPublicShell(page: Page) {
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204 }))
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ status: 401, json: { success: false, message: 'Unauthenticated.' } }))
  await page.route('**/api/v1/cart', (route) => route.fulfill({ json: { success: true, data: { items: [], subtotal: 0, count: 0 } } }))
}

async function sourceImage(page: Page) {
  return Buffer.from(await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 900
    canvas.height = 1400
    const context = canvas.getContext('2d')!
    context.fillStyle = '#6f3f4d'
    context.fillRect(0, 0, 900, 700)
    context.fillStyle = '#efc2cc'
    context.fillRect(0, 700, 900, 700)
    return canvas.toDataURL('image/png').split(',')[1]
  }), 'base64')
}

const adminPageData = {
  content: {
    eyebrow: 'CẨM NANG', title: 'Hướng dẫn', description: 'Mô tả', featured_article_id: null,
    featured_badge_label: 'Nổi bật', list_eyebrow: 'KIẾN THỨC', list_title: 'Bài hướng dẫn', list_description: 'Mô tả danh sách',
    show_cta: true, cta_eyebrow: 'TƯ VẤN', cta_title: 'Cần hỗ trợ?', cta_description: 'Mô tả CTA',
    cta_primary_label: 'Liên hệ', cta_primary_url: '/lien-he', cta_secondary_label: 'Sản phẩm', cta_secondary_url: '/san-pham',
    hero_image_path: null, hero_image_alt: null, cta_image_path: null, cta_image_alt: null,
  },
  seo: { title: 'Hướng dẫn | LADYSTARS', description: 'Mô tả' },
  articles: [],
}

test('admin crop bìa và ảnh nội dung hướng dẫn cùng tỷ lệ 16:9', async ({ page }) => {
  await mockAdminAuth(page)
  const uploads = new Map<string, Buffer | null>()
  await page.route('**/api/v1/admin/guides', async (route) => {
    if (route.request().method() === 'POST') return route.fulfill({ status: 201, json: { success: true, data: { id: 71, title: 'Hướng dẫn crop', slug: 'huong-dan-crop', status: 'draft' } } })
    return route.continue()
  })
  for (const slot of ['cover-image', 'content-image']) {
    await page.route(`**/api/v1/admin/guides/71/${slot}`, (route) => {
      uploads.set(slot, route.request().postDataBuffer())
      return route.fulfill({ status: 201, json: { success: true, data: { id: 71 } } })
    })
  }

  await page.goto('/admin/guides/create')
  await page.getByLabel('Tiêu đề', { exact: true }).fill('Hướng dẫn crop')
  const image = await sourceImage(page)
  for (const title of ['bìa bài hướng dẫn', 'minh họa nội dung']) {
    await page.getByLabel(`Chọn ảnh ${title}`).setInputFiles({ name: `${title.replaceAll(' ', '-')}.png`, mimeType: 'image/png', buffer: image })
    const dialog = page.getByRole('dialog', { name: `Cắt ảnh ${title}` })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('tỷ lệ 16:9')
    await page.getByLabel(`Căn dọc ảnh ${title}`).fill('0.45')
    await dialog.getByRole('button', { name: 'Dùng ảnh đã cắt' }).click()
  }
  await expect(page.locator('.home-image-admin-preview.is-guideCover')).toBeVisible()
  await expect(page.locator('.home-image-admin-preview.is-guideContent')).toBeVisible()
  await page.screenshot({ path: '../artifacts/admin-guides-article-crop.png', fullPage: true })
  await page.getByRole('button', { name: 'Lưu bản nháp' }).click()
  await expect(page).toHaveURL(/admin\/guides$/)
  for (const slot of ['cover-image', 'content-image']) {
    expect(uploads.get(slot)).not.toBeNull()
    expect(uploads.get(slot)!.includes(Buffer.from('image/webp'))).toBeTruthy()
    expect(uploads.get(slot)!.includes(Buffer.from('-cropped.webp'))).toBeTruthy()
  }
})

test('admin crop banner 16:9 và CTA 4:3 cho trang hướng dẫn', async ({ page }) => {
  await mockAdminAuth(page)
  const uploads = new Map<string, Buffer | null>()
  await page.route('**/api/v1/admin/guides-page', (route) => route.fulfill({ json: { success: true, data: adminPageData } }))
  for (const slot of ['hero-image', 'cta-image']) {
    await page.route(`**/api/v1/admin/guides-page/${slot}`, (route) => {
      uploads.set(slot, route.request().postDataBuffer())
      return route.fulfill({ status: 201, json: { success: true, data: adminPageData } })
    })
  }

  await page.goto('/admin/guides/settings')
  const image = await sourceImage(page)
  for (const [title, ratio] of [['banner trang hướng dẫn', '16:9'], ['CTA trang hướng dẫn', '4:3']] as const) {
    await page.getByLabel(`Chọn ảnh ${title}`).setInputFiles({ name: `${ratio}.png`, mimeType: 'image/png', buffer: image })
    const dialog = page.getByRole('dialog', { name: `Cắt ảnh ${title}` })
    await expect(dialog).toContainText(`tỷ lệ ${ratio}`)
    await dialog.getByRole('button', { name: 'Dùng ảnh đã cắt' }).click()
  }
  await page.screenshot({ path: '../artifacts/admin-guides-page-crop.png', fullPage: true })
  await page.getByRole('button', { name: 'Lưu thiết lập' }).click()
  await expect(page.getByText('Đã lưu thiết lập trang hướng dẫn.')).toBeVisible()
  for (const slot of ['hero-image', 'cta-image']) {
    expect(uploads.get(slot)).not.toBeNull()
    expect(uploads.get(slot)!.includes(Buffer.from('image/webp'))).toBeTruthy()
  }
})

test('click bài hướng dẫn mở chi tiết có ảnh và YouTube', async ({ page }) => {
  await mockPublicShell(page)
  const imagePath = '/e2e/guide-portrait.svg'
  await page.route('**/e2e/guide-portrait.svg', (route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns=http://www.w3.org/2000/svg width=700 height=1400><rect width=700 height=1400 fill=#d7aab5/></svg>' }))
  const summary = { id: 1, title: 'Hướng dẫn chăm sóc chi tiết', slug: 'cham-soc-chi-tiet', excerpt: 'Tóm tắt', cover_image_path: imagePath, category: 'Hướng dẫn', published_at: '2026-08-08T00:00:00Z' }
  await page.route('**/api/v1/guides-page**', (route) => route.fulfill({ json: { success: true, data: { content: { title: 'Hướng dẫn', hero_image_path: imagePath, show_cta: true, cta_title: 'CTA', cta_image_path: imagePath }, seo: {}, featured: summary, articles: { current_page: 1, data: [summary], last_page: 1, per_page: 9, total: 1 } } } }))
  await page.route('**/api/v1/guides/cham-soc-chi-tiet', (route) => route.fulfill({ json: { success: true, data: { ...summary, status: 'published', content: 'Bước một.\n\nBước hai.', content_image_path: imagePath, video_url: 'https://youtu.be/dQw4w9WgXcQ', video_title: 'Video chăm sóc' } } }))

  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport)
    await page.goto('/huong-dan')
    await page.locator('.guide-card').click()
    await expect(page).toHaveURL('/huong-dan/cham-soc-chi-tiet')
    await expect(page.locator('.guide-detail h1')).toHaveText('Hướng dẫn chăm sóc chi tiết')
    await expect(page.locator('.guide-detail-video iframe')).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    const geometry = await page.evaluate(() => {
      const ratio = (selector: string) => { const bounds = document.querySelector(selector)!.getBoundingClientRect(); return bounds.width / bounds.height }
      return {
        cover: ratio('.news-detail-cover'), content: ratio('.guide-detail-media img'), video: ratio('.guide-detail-video-frame'),
        fits: [...document.querySelectorAll('.news-detail-cover, .guide-detail-media img')].map((element) => getComputedStyle(element).objectFit),
        overflow: document.documentElement.scrollWidth - innerWidth,
      }
    })
    expect(geometry.cover).toBeCloseTo(16 / 9, 2)
    expect(geometry.content).toBeCloseTo(16 / 9, 2)
    expect(geometry.video).toBeCloseTo(16 / 9, 2)
    expect(geometry.fits.every((fit) => fit === 'cover')).toBe(true)
    expect(geometry.overflow).toBeLessThanOrEqual(0)
  }
})

test('chi tiết hướng dẫn phát video trực tiếp bằng thẻ video', async ({ page }) => {
  await mockPublicShell(page)
  await page.route('**/api/v1/guides/video-truc-tiep', (route) => route.fulfill({ json: { success: true, data: { id: 2, title: 'Video trực tiếp', slug: 'video-truc-tiep', content: 'Nội dung', status: 'published', video_path: '/storage/guides/2/video/demo.mp4', video_title: 'Video tải lên' } } }))
  await page.goto('/huong-dan/video-truc-tiep')
  await expect(page.locator('.guide-detail-video video')).toHaveAttribute('src', /\/storage\/guides\/2\/video\/demo\.mp4$/)
  await expect(page.locator('.guide-detail-video-frame')).toHaveCSS('aspect-ratio', '16 / 9')
})

test('ảnh ngang dọc vuông fill khung hướng dẫn không méo', async ({ page }) => {
  await mockPublicShell(page)
  let imagePath = '/e2e/guide-1600x900.svg'
  await page.route('**/e2e/guide-*.svg', (route) => {
    const size = route.request().url().match(/guide-(\d+)x(\d+)/)
    const width = Number(size?.[1]); const height = Number(size?.[2])
    route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns=http://www.w3.org/2000/svg width=${width} height=${height}><rect width=100% height=100% fill=#d7aab5/></svg>` })
  })
  const article = () => ({ id: 3, title: 'Khung ảnh', slug: 'khung-anh', cover_image_path: imagePath, category: 'Hướng dẫn' })
  await page.route('**/api/v1/guides-page**', (route) => route.fulfill({ json: { success: true, data: { content: { title: 'Hướng dẫn', hero_image_path: imagePath, show_cta: true, cta_title: 'CTA', cta_image_path: imagePath }, seo: {}, featured: article(), articles: { current_page: 1, data: [article()], last_page: 1, per_page: 9, total: 1 } } } }))
  await page.route('**/api/v1/guides/khung-anh', (route) => route.fulfill({ json: { success: true, data: { ...article(), status: 'published', content: 'Nội dung', content_image_path: imagePath } } }))

  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport)
    for (const size of ['1600x900', '900x1600', '1000x1000']) {
      imagePath = `/e2e/guide-${size}.svg`
      await page.goto('/huong-dan')
      await expect(page.locator('.guide-card')).toBeVisible()
      await expect(page.locator('.news-cta-image')).toBeVisible()
      await expect(page.locator('.guide-featured-image')).toBeVisible()
      const listing = await page.evaluate(() => ({
        card: document.querySelector('.news-article-image-wrap')!.getBoundingClientRect(),
        cta: document.querySelector('.news-cta-image')!.getBoundingClientRect(),
        fits: [...document.querySelectorAll('.guide-featured-image, .news-article-image, .news-cta-image')].map((node) => getComputedStyle(node).objectFit),
        hero: getComputedStyle(document.querySelector('.guide-journal-hero')!).backgroundSize,
      }))
      expect(listing.card.width / listing.card.height).toBeCloseTo(16 / 9, 2)
      expect(listing.cta.width / listing.cta.height).toBeCloseTo(4 / 3, 2)
      expect(listing.fits.every((fit) => fit === 'cover')).toBe(true)
      expect(listing.hero).toBe('cover')
      await page.locator('.guide-card').click()
      for (const selector of ['.news-detail-cover', '.guide-detail-media img']) {
        const media = await page.locator(selector).evaluate((node) => { const box = node.getBoundingClientRect(); return { ratio: box.width / box.height, fit: getComputedStyle(node).objectFit } })
        expect(media.ratio).toBeCloseTo(16 / 9, 2)
        expect(media.fit).toBe('cover')
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
    }
  }
})
