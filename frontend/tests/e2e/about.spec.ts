import { expect, test } from '@playwright/test'
import { aboutFallbackSections } from '../../src/data/aboutContent'

test.describe.configure({ timeout: 60_000 })

test('trang giới thiệu hiển thị đầy đủ các section câu chuyện thương hiệu', async ({ page }) => {
  await page.goto('/gioi-thieu')
  await expect(page).toHaveTitle(/Câu chuyện thương hiệu/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Không chỉ là mái tóc')
  await expect(page.getByRole('heading', { name: /khiến bạn thấy là chính mình/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Bắt đầu từ sự lắng nghe' })).toBeVisible()
  await expect(page.getByRole('heading', { name: /trải nghiệm cá nhân hóa/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Những điều LADYSTARS luôn giữ vững' })).toBeVisible()
  await expect(page.getByRole('heading', { name: /đi xa hơn/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Những người tạo nên trải nghiệm/ })).toBeVisible()
  await page.screenshot({ path: '../artifacts/about-desktop.png', fullPage: true })
})

test('timeline quy trình hiển thị đúng 4 mốc', async ({ page }) => {
  await page.goto('/gioi-thieu')
  const timeline = page.locator('.about-process-track li')
  await expect(timeline).toHaveCount(4)
  await expect(page.getByRole('heading', { name: /Cách chúng tôi tạo nên/ })).toBeVisible()
})

test('CTA trong trang giới thiệu dẫn đúng route', async ({ page }) => {
  await page.goto('/gioi-thieu')
  await page.locator('.about-hero').getByRole('link', { name: 'Khám phá sản phẩm' }).click()
  await expect(page).toHaveURL(/san-pham/)
  await page.goto('/gioi-thieu')
  await page.locator('.about-final-cta').getByRole('link', { name: 'Nhận tư vấn riêng' }).click()
  await expect(page).toHaveURL(/lien-he/)
})

test('trang giới thiệu không tràn ngang ở mobile và header hoạt động', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/gioi-thieu')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  await expect(page.locator('.about-process-track li')).toHaveCount(4)
  await page.screenshot({ path: '../artifacts/about-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Mở menu' }).click()
  await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toBeVisible()
  await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Trang chủ', exact: true }).click()
  await expect(page).toHaveURL(/\/$/)
})

test('ảnh About luôn fill khung cố định với mọi tỷ lệ nguồn', async ({ page }) => {
  let activeImagePath = '/e2e/about-source-1600x900.svg'
  await page.route('**/e2e/about-source-*.svg', (route) => {
    const match = route.request().url().match(/about-source-(\d+)x(\d+)\.svg/)
    const width = Number(match?.[1] ?? 1600)
    const height = Number(match?.[2] ?? 900)
    route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#d7aab5"/><circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 4}" fill="#6f3f4d"/></svg>` })
  })
  await page.route('**/api/v1/about', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      data: {
        sections: aboutFallbackSections.map((section) => section.image_path ? { ...section, image_path: activeImagePath } : section),
        seo: { title: 'Câu chuyện thương hiệu | LADYSTARS', description: null },
      },
    }),
  }))

  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport)
    for (const [width, height] of [[1600, 900], [900, 1600], [1000, 1000], [2400, 800], [800, 2400]]) {
      activeImagePath = `/e2e/about-source-${width}x${height}.svg`
      await page.goto('/gioi-thieu')
      await expect(page.locator('.about-showcase-visual img')).toBeVisible()
      const geometry = await page.evaluate(() => {
        const ratio = (selector: string) => {
          const bounds = document.querySelector(selector)!.getBoundingClientRect()
          return bounds.width / bounds.height
        }
        return {
          hero: ratio('.about-hero-visual'),
          story: ratio('.about-story-visual img'),
          showcase: ratio('.about-showcase-visual img'),
          objectFits: [...document.querySelectorAll('.about-hero-visual img, .about-story-visual img, .about-showcase-visual img')].map((image) => getComputedStyle(image).objectFit),
        }
      })
      expect(geometry.hero).toBeCloseTo(1, 2)
      expect(geometry.story).toBeCloseTo(1, 2)
      expect(geometry.showcase).toBeCloseTo(8 / 3, 2)
      expect(geometry.objectFits.every((value) => value === 'cover')).toBe(true)
    }
  }
})
