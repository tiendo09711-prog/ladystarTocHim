import { expect, test } from '@playwright/test'
import { defaultHomePageSections } from '../../src/data/homeContent'

const homeContent = {
  id: 1,
  page_key: 'home',
  announcement_messages: ['LADYSTARS'],
  announcement_interval_seconds: 5,
  announcement_enabled: true,
  hero_image_path: '/images/brand/ladystars-hero.svg',
  hero_image_alt: 'Hero',
  brand_story_image_path: '/images/brand/ladystars-hero.svg',
  sections: {
    ...defaultHomePageSections,
    solutions: { ...defaultHomePageSections.solutions, image_path: '/images/brand/ladystars-hero.svg' },
    styles: { ...defaultHomePageSections.styles, items: defaultHomePageSections.styles.items.map((item) => ({ ...item, image_path: '/images/brand/ladystars-hero.svg' })) },
    process: { ...defaultHomePageSections.process, steps: defaultHomePageSections.process.steps.map((step) => ({ ...step, image_path: '/images/brand/ladystars-hero.svg' })) },
    testimonials: { ...defaultHomePageSections.testimonials, items: defaultHomePageSections.testimonials.items.map((item) => ({ ...item, image_path: '/images/brand/ladystars-hero.svg' })) },
  },
}

async function mockAdmin(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/admin/home-page', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: homeContent }),
  }))
}

test('admin cắt ảnh Hero đúng tỷ lệ trước khi upload', async ({ page }) => {
  await mockAdmin(page)
  let uploadedBody: Buffer | null = null
  await page.route('**/api/v1/admin/home-page/hero-image', async (route) => {
    uploadedBody = route.request().postDataBuffer()
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { ...homeContent, hero_image_path: '/images/product-placeholder.svg' } }),
    })
  })

  await page.goto('/admin/login')
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).toHaveURL(/admin\/dashboard/, { timeout: 20_000 })
  await page.goto('/admin/home-page')
  await expect(page.getByRole('heading', { name: 'Chỉnh sửa trang chủ' })).toBeVisible()
  const imageBase64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 900
    canvas.height = 600
    const context = canvas.getContext('2d')!
    context.fillStyle = '#7f3f52'
    context.fillRect(0, 0, 450, 600)
    context.fillStyle = '#efc2cc'
    context.fillRect(450, 0, 450, 600)
    return canvas.toDataURL('image/png').split(',')[1]
  })

  await page.getByLabel('Chọn ảnh Hero').setInputFiles({ name: 'hero-source.png', mimeType: 'image/png', buffer: Buffer.from(imageBase64, 'base64') })
  const dialog = page.getByRole('dialog', { name: 'Cắt ảnh Hero' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('tỷ lệ 16:9')
  await page.getByLabel('Thu phóng ảnh Hero').fill('1.35')
  await page.getByLabel('Căn ngang ảnh Hero').fill('0.4')
  await page.getByRole('button', { name: 'Dùng ảnh đã cắt' }).click()

  await expect(page.getByText('Đã cập nhật ảnh Hero.')).toBeVisible()
  expect(uploadedBody).not.toBeNull()
  expect(uploadedBody!.includes(Buffer.from('hero-source-cropped.webp'))).toBeTruthy()
  expect(uploadedBody!.includes(Buffer.from('image/webp'))).toBeTruthy()
})

test('các khung ảnh trang chủ giữ đúng tỷ lệ trên desktop và mobile', async ({ page }) => {
  await page.route('**/api/v1/home-page', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: homeContent }),
  }))

  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(page.locator('.home-story-image img')).toBeVisible()
    const geometry = await page.evaluate((isMobile) => {
      const ratio = (selector: string) => {
        const bounds = document.querySelector(selector)!.getBoundingClientRect()
        return bounds.width / bounds.height
      }
      const testimonialCard = document.querySelector(isMobile ? '.home-testimonial-mobile' : '.home-testimonial-grid button')!.getBoundingClientRect()
      const testimonialImage = document.querySelector(isMobile ? '.home-testimonial-mobile img' : '.home-testimonial-grid img')!.getBoundingClientRect()
      const heroVisual = document.querySelector('.home-hero-visual')!.getBoundingClientRect()
      const heroMedia = document.querySelector('.home-hero-media')!.getBoundingClientRect()
      return {
        ratios: {
          hero: ratio('.home-hero-media'),
          story: ratio('.home-story-image'),
          solution: ratio('.home-solution-art'),
          style: ratio('.home-style-card'),
          process: ratio('.home-process-grid article img'),
          testimonial: ratio(isMobile ? '.home-testimonial-mobile img' : '.home-testimonial-grid img'),
        },
        testimonialEdgeGap: Math.max(Math.abs(testimonialImage.left - testimonialCard.left), Math.abs(testimonialImage.right - testimonialCard.right)),
        heroCenterGap: Math.abs((heroMedia.top + heroMedia.height / 2) - (heroVisual.top + heroVisual.height / 2)),
      }
    }, viewport.width <= 640)
    expect(geometry.ratios.hero).toBeCloseTo(16 / 9, 1)
    expect(geometry.ratios.story).toBeCloseTo(1, 1)
    expect(geometry.ratios.solution).toBeCloseTo(6 / 5, 1)
    expect(geometry.ratios.style).toBeCloseTo(4 / 3, 1)
    expect(geometry.ratios.process).toBeCloseTo(2, 1)
    expect(geometry.ratios.testimonial).toBeCloseTo(12 / 5, 1)
    expect(geometry.testimonialEdgeGap).toBeLessThanOrEqual(1)
    if (viewport.width > 640) expect(geometry.heroCenterGap).toBeLessThanOrEqual(1)
  }
})
