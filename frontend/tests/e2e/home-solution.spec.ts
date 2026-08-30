import { expect, test } from '@playwright/test'
import { homeSectionsFixture } from './fixtures/homeContent'

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
    ...homeSectionsFixture,
    solutions: { ...homeSectionsFixture.solutions, image_path: '/images/brand/ladystars-hero.svg' },
  },
}

test('section giải pháp premium responsive tại các viewport yêu cầu', async ({ page }) => {
  await page.route('**/api/v1/home-page', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: homeContent }),
  }))

  for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 900 }, { width: 1024, height: 900 }, { width: 768, height: 1024 }, { width: 430, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    const section = page.locator('.home-solution-grid')
    const image = section.locator('.home-solution-art img')
    await section.scrollIntoViewIfNeeded()
    await expect(image).toBeVisible()
    await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)

    const geometry = await section.evaluate((element, width) => {
      const grid = element as HTMLElement
      const copy = grid.querySelector('.home-solution-copy')!.getBoundingClientRect()
      const visual = grid.querySelector('.home-solution-visual')!.getBoundingClientRect()
      const art = grid.querySelector('.home-solution-art') as HTMLElement
      const artBounds = art.getBoundingClientRect()
      const heading = grid.querySelector('h2') as HTMLElement
      const headingLineHeight = Number.parseFloat(getComputedStyle(heading).lineHeight)
      const caption = grid.querySelector('.home-solution-art p')!.getBoundingClientRect()
      const benefits = [...grid.querySelectorAll('.home-solution-benefits li')].map((item) => item.getBoundingClientRect())
      const action = grid.querySelector('.home-solution-cta')!.getBoundingClientRect()
      const imageElement = grid.querySelector('.home-solution-art img') as HTMLImageElement

      return {
        ratio: artBounds.width / artBounds.height,
        height: grid.getBoundingClientRect().height,
        minHeight: getComputedStyle(grid).minHeight,
        headingLines: heading.getBoundingClientRect().height / headingLineHeight,
        imageObjectFit: getComputedStyle(imageElement).objectFit,
        captionInside: caption.left >= artBounds.left && caption.right <= artBounds.right && caption.top >= artBounds.top && caption.bottom <= artBounds.bottom,
        benefitsShareRow: benefits.length < 2 || Math.abs(benefits[0].top - benefits[1].top) <= 1,
        textBeforeImage: copy.bottom <= visual.top,
        visualWidth: visual.width,
        balanceGap: Math.abs(copy.height - visual.height),
        actionHeight: action.height,
        noOverflow: document.documentElement.scrollWidth <= width,
      }
    }, viewport.width)

    expect(geometry.ratio).toBeCloseTo(6 / 5, 2)
    expect(geometry.minHeight).toBe('0px')
    expect(geometry.imageObjectFit).toBe('cover')
    expect(geometry.captionInside).toBe(true)
    expect(geometry.actionHeight).toBeLessThan(60)
    expect(geometry.noOverflow).toBe(true)
    expect(geometry.benefitsShareRow).toBe(viewport.width >= 768)
    if (viewport.width >= 1024) {
      expect(geometry.height).toBeLessThan(600)
      expect(geometry.visualWidth).toBeLessThanOrEqual(511)
      expect(geometry.balanceGap).toBeLessThan(150)
    }
    if (viewport.width >= 1280) expect(geometry.headingLines).toBeLessThanOrEqual(2.2)
    else expect(geometry.headingLines).toBeLessThanOrEqual(3.2)
    if (viewport.width <= 820) {
      expect(geometry.textBeforeImage).toBe(true)
      expect(geometry.height).toBeLessThan(950)
    }

    await section.screenshot({ path: `../artifacts/home-solution-${viewport.width}.png` })
  }
})
