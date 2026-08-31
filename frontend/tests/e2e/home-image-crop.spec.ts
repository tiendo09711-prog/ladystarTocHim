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
    hero: { ...homeSectionsFixture.hero, image_position_x: 32, image_position_y: 44 },
    brand_story: { ...homeSectionsFixture.brand_story, image_position_x: 47, image_position_y: 39 },
    solutions: { ...homeSectionsFixture.solutions, image_path: '/images/brand/ladystars-hero.svg', image_position_x: 61, image_position_y: 37 },
    styles: { ...homeSectionsFixture.styles, items: homeSectionsFixture.styles.items.map((item) => ({ ...item, image_path: '/images/brand/ladystars-hero.svg', image_position_x: 42, image_position_y: 33 })) },
    process: { ...homeSectionsFixture.process, steps: homeSectionsFixture.process.steps.map((step) => ({ ...step, image_path: '/images/brand/ladystars-hero.svg', image_position_x: 55, image_position_y: 41 })) },
    testimonials: { ...homeSectionsFixture.testimonials, items: homeSectionsFixture.testimonials.items.map((item) => ({ ...item, image_path: '/images/brand/ladystars-hero.svg', image_position_x: 46, image_position_y: 35 })) },
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
  await page.getByLabel('Email').fill('admin@namhair.local')
  await page.getByLabel('Mật khẩu').fill(process.env.E2E_ADMIN_PASSWORD!)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).toHaveURL(/admin\/dashboard/, { timeout: 20_000 })
  await page.goto('/admin/home-page')
  await expect(page.getByRole('heading', { name: 'Chỉnh sửa trang chủ' })).toBeVisible()
  const heroPreview = page.locator('.home-image-admin-preview.is-hero')
  await expect(heroPreview).toBeVisible()
  const previewGeometry = await heroPreview.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    return { ratio: bounds.width / bounds.height, width: bounds.width, radius: getComputedStyle(element).borderRadius }
  })
  expect(previewGeometry.ratio).toBeCloseTo(16 / 9, 2)
  expect(previewGeometry.width).toBeLessThanOrEqual(700)
  expect(previewGeometry.radius).toBe('18px')
  const solutionsDetails = page.locator('details').filter({ hasText: 'Giải pháp dành cho bạn' })
  await solutionsDetails.locator('summary').click()
  const solutionsPreview = solutionsDetails.locator('.home-image-admin-preview.is-solution')
  await expect(solutionsPreview).toBeVisible()
  const solutionsPreviewGeometry = await solutionsPreview.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    return { ratio: bounds.width / bounds.height, width: bounds.width, radius: getComputedStyle(element).borderRadius }
  })
  expect(solutionsPreviewGeometry.ratio).toBeCloseTo(6 / 5, 2)
  expect(solutionsPreviewGeometry.width).toBeLessThanOrEqual(660)
  expect(solutionsPreviewGeometry.radius).toBe('20px')
  for (const preview of [
    { detailsIndex: 5, selector: '.home-image-admin-preview.is-inspiration', ratio: 4 / 3 },
    { detailsIndex: 6, selector: '.home-image-admin-preview.is-process', ratio: 16 / 9 },
    { detailsIndex: 7, selector: '.home-image-admin-preview.is-testimonial', ratio: 16 / 9 },
  ]) {
    const details = page.locator('details').nth(preview.detailsIndex)
    await details.locator('summary').click()
    const frame = details.locator(preview.selector).first()
    await expect(frame).toBeVisible()
    const ratio = await frame.evaluate((element) => { const bounds = element.getBoundingClientRect(); return bounds.width / bounds.height })
    expect(ratio).toBeCloseTo(preview.ratio, 2)
  }
  await solutionsPreview.screenshot({ path: '../artifacts/admin-solution-preview.png' })
  await page.getByLabel('Vị trí ảnh Hero ngang').fill('34')
  await page.getByLabel('Vị trí ảnh Hero dọc').fill('41')
  await expect(heroPreview.locator('img')).toHaveCSS('object-position', '34% 41%')
  const stylePositionInputs = page.locator('details').nth(5).locator('.home-image-position-controls').first().locator('input')
  await stylePositionInputs.nth(0).fill('58')
  await stylePositionInputs.nth(1).fill('29')
  await expect(page.locator('.home-image-admin-preview.is-inspiration').first().locator('img')).toHaveCSS('object-position', '58% 29%')
  await page.screenshot({ path: '../artifacts/admin-hero-preview.png' })
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

test('mọi nhóm ảnh Home Page đều mở cùng trình crop đúng tỷ lệ', async ({ page }) => {
  await mockAdmin(page)
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill('admin@namhair.local')
  await page.getByLabel('Mật khẩu').fill(process.env.E2E_ADMIN_PASSWORD!)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).toHaveURL(/admin\/dashboard/, { timeout: 20_000 })
  await page.goto('/admin/home-page')

  const imageBase64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 1200
    const context = canvas.getContext('2d')!
    context.fillStyle = '#7f3f52'
    context.fillRect(0, 0, 800, 600)
    context.fillStyle = '#efc2cc'
    context.fillRect(0, 600, 800, 600)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  const imageFile = { name: 'home-section-source.png', mimeType: 'image/png', buffer: Buffer.from(imageBase64, 'base64') }
  const targets = [
    { section: 'Nội dung Hero', input: 'Chọn ảnh Hero', dialog: 'Cắt ảnh Hero', ratio: '16:9', badge: 'Cắt ảnh 16:9' },
    { section: 'Câu chuyện thương hiệu', input: 'Chọn ảnh Câu chuyện thương hiệu', dialog: 'Cắt ảnh Câu chuyện thương hiệu', ratio: '1:1', badge: 'Cắt ảnh 1:1' },
    { section: 'Giải pháp dành cho bạn', input: 'Chọn ảnh Giải pháp dành cho bạn', dialog: 'Cắt ảnh Giải pháp dành cho bạn', ratio: '6:5', badge: 'Cắt ảnh 6:5' },
    { section: 'Cảm hứng phong cách', input: 'Chọn ảnh Phong cách 1', dialog: 'Cắt ảnh Phong cách 1', ratio: '4:3', badge: 'Cắt từng ảnh 4:3' },
    { section: 'Quy trình', input: 'Chọn ảnh Bước 01', dialog: 'Cắt ảnh Bước 01', ratio: '16:9', badge: 'Cắt từng ảnh 16:9' },
    { section: 'Cảm nhận khách hàng', input: 'Chọn ảnh Cảm nhận 1', dialog: 'Cắt ảnh Cảm nhận 1', ratio: '16:9', badge: 'Cắt từng ảnh 16:9' },
  ]

  for (const target of targets) {
    const details = page.locator('details').filter({ hasText: target.section }).first()
    if (!(await details.evaluate((element) => (element as HTMLDetailsElement).open))) await details.locator('summary').click()
    await expect(details.getByText(target.badge, { exact: true })).toBeVisible()
    await details.getByLabel(target.input, { exact: true }).first().setInputFiles(imageFile)
    const dialog = page.getByRole('dialog', { name: target.dialog })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(`tỷ lệ ${target.ratio}`)
    await page.getByRole('button', { name: 'Đóng trình cắt ảnh' }).click()
    await expect(dialog).toBeHidden()
  }

  await page.screenshot({ path: '../artifacts/admin-home-all-crop-sections.png', fullPage: true })
})

test('admin lưu danh sách lợi ích theo từng dòng', async ({ page }) => {
  let savedPayload: typeof homeContent | null = null
  let serverContent = homeContent
  await page.route('**/api/v1/admin/home-page', async (route) => {
    if (route.request().method() === 'PUT') {
      savedPayload = route.request().postDataJSON() as typeof homeContent
      serverContent = savedPayload
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: savedPayload }) })
      return
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: serverContent }) })
  })

  await page.goto('/admin/login')
  await page.getByLabel('Email').fill('admin@namhair.local')
  await page.getByLabel('Mật khẩu').fill(process.env.E2E_ADMIN_PASSWORD!)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).toHaveURL(/admin\/dashboard/, { timeout: 20_000 })
  await page.goto('/admin/home-page')
  const solutionsDetails = page.locator('details').filter({ hasText: 'Giải pháp dành cho bạn' })
  await solutionsDetails.locator('summary').click()
  await solutionsDetails.getByLabel('Các lợi ích').fill('Lợi ích một\n\n Lợi ích hai \nLợi ích ba\nLợi ích bốn')
  const solutionPositionInputs = solutionsDetails.locator('.home-image-position-controls input')
  await solutionPositionInputs.nth(0).fill('63')
  await solutionPositionInputs.nth(1).fill('27')
  await page.getByRole('button', { name: 'Lưu toàn bộ trang chủ' }).click()
  await expect(page.getByText('Đã lưu toàn bộ nội dung trang chủ.')).toBeVisible()
  expect(savedPayload?.sections.solutions.bullets).toEqual(['Lợi ích một', 'Lợi ích hai', 'Lợi ích ba', 'Lợi ích bốn'])
  expect(savedPayload?.sections.solutions.image_position_x).toBe(63)
  expect(savedPayload?.sections.solutions.image_position_y).toBe(27)
  await page.reload()
  const reloadedSolutions = page.locator('details').filter({ hasText: 'Giải pháp dành cho bạn' })
  await reloadedSolutions.locator('summary').click()
  await expect(reloadedSolutions.locator('.home-image-admin-preview img')).toHaveCSS('object-position', '63% 27%')
})

test('Hero và các khung ảnh trang chủ responsive đúng tại các viewport chính', async ({ page }) => {
  await page.route('**/api/v1/home-page', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: homeContent }),
  }))

  for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 900 }, { width: 1024, height: 900 }, { width: 768, height: 1024 }, { width: 430, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(page.locator('.home-story-image img')).toBeVisible()
    await expect(page.locator('.home-solution-art img')).toBeVisible()
    await page.screenshot({ path: `../artifacts/home-hero-${viewport.width}.png` })
    const geometry = await page.evaluate((isMobile) => {
      const ratio = (selector: string) => {
        const bounds = document.querySelector(selector)!.getBoundingClientRect()
        return bounds.width / bounds.height
      }
      const testimonialCard = document.querySelector(isMobile ? '.home-testimonial-mobile' : '.home-testimonial-grid button')!.getBoundingClientRect()
      const testimonialImage = document.querySelector(isMobile ? '.home-testimonial-mobile .home-testimonial-media' : '.home-testimonial-grid .home-testimonial-media')!.getBoundingClientRect()
      const hero = document.querySelector('.home-hero')!.getBoundingClientRect()
      const heroCopy = document.querySelector('.home-hero-copy')!.getBoundingClientRect()
      const heroFrame = document.querySelector('.home-hero-image-frame')!.getBoundingClientRect()
      const heroNote = document.querySelector('.home-hero-note')!.getBoundingClientRect()
      const heroHeading = document.querySelector('.home-hero h1') as HTMLElement
      const heroImage = document.querySelector('.home-hero-image-frame img') as HTMLImageElement
      const primaryAction = document.querySelector('.home-hero-actions .btn-primary')!.getBoundingClientRect()
      const solutionGrid = document.querySelector('.home-solution-grid') as HTMLElement
      const solutionCopy = document.querySelector('.home-solution-copy')!.getBoundingClientRect()
      const solutionVisual = document.querySelector('.home-solution-visual')!.getBoundingClientRect()
      const solutionArt = document.querySelector('.home-solution-art')!.getBoundingClientRect()
      const solutionHeading = document.querySelector('.home-solution-copy h2') as HTMLElement
      const solutionImage = document.querySelector('.home-solution-art img') as HTMLImageElement
      const solutionCaption = document.querySelector('.home-solution-art p')!.getBoundingClientRect()
      const solutionBenefits = [...document.querySelectorAll('.home-solution-benefits li')].map((item) => item.getBoundingClientRect())
      const solutionAction = document.querySelector('.home-solution-cta')!.getBoundingClientRect()
      const solutionHeadingLineHeight = Number.parseFloat(getComputedStyle(solutionHeading).lineHeight)
      const sameSize = (selector: string) => {
        const frames = [...document.querySelectorAll(selector)].map((element) => element.getBoundingClientRect())
        return frames.length < 2 || frames.every((frame) => Math.abs(frame.width - frames[0].width) <= 1 && Math.abs(frame.height - frames[0].height) <= 1)
      }
      const productFrame = document.querySelector('.home-product-grid .product-card-image')
      return {
        ratios: {
          hero: ratio('.home-hero-image-frame'),
          product: productFrame ? ratio('.home-product-grid .product-card-image') : null,
          story: ratio('.home-story-image'),
          solution: ratio('.home-solution-art'),
          style: ratio('.home-style-card'),
          process: ratio('.home-process-media'),
          testimonial: ratio(isMobile ? '.home-testimonial-mobile .home-testimonial-media' : '.home-testimonial-grid .home-testimonial-media'),
        },
        testimonialEdgeGap: Math.max(Math.abs(testimonialImage.left - testimonialCard.left), Math.abs(testimonialImage.right - testimonialCard.right)),
        noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth,
        headingFits: heroHeading.scrollWidth <= heroHeading.clientWidth + 1,
        imageObjectFit: getComputedStyle(heroImage).objectFit,
        imageObjectPosition: getComputedStyle(heroImage).objectPosition,
        frameWidthShare: heroFrame.width / hero.width,
        noteInsideViewport: heroNote.left >= 0 && heroNote.right <= window.innerWidth,
        textBeforeImage: heroCopy.bottom <= heroFrame.top,
        heroHeight: hero.height,
        primaryActionHeight: primaryAction.height,
        solutionGridHeight: solutionGrid.getBoundingClientRect().height,
        solutionGridMinHeight: getComputedStyle(solutionGrid).minHeight,
        solutionHeadingLines: solutionHeading.getBoundingClientRect().height / solutionHeadingLineHeight,
        solutionImageObjectFit: getComputedStyle(solutionImage).objectFit,
        solutionImageObjectPosition: getComputedStyle(solutionImage).objectPosition,
        solutionCaptionInsideImage: solutionCaption.left >= solutionArt.left && solutionCaption.right <= solutionArt.right && solutionCaption.top >= solutionArt.top && solutionCaption.bottom <= solutionArt.bottom,
        solutionBenefitsShareRow: solutionBenefits.length < 2 || Math.abs(solutionBenefits[0].top - solutionBenefits[1].top) <= 1,
        solutionTextBeforeImage: solutionCopy.bottom <= solutionVisual.top,
        solutionVisualWidth: solutionVisual.width,
        solutionBalanceGap: Math.abs(solutionCopy.height - solutionVisual.height),
        solutionActionHeight: solutionAction.height,
        styleCardsEqual: sameSize('.home-style-card'),
        processCardsEqual: sameSize('.home-process-grid article'),
        testimonialCardsEqual: isMobile || sameSize('.home-testimonial-grid button'),
      }
    }, viewport.width <= 640)
    expect(geometry.ratios.hero).toBeCloseTo(16 / 9, 2)
    if (geometry.ratios.product !== null) expect(geometry.ratios.product).toBeCloseTo(1, 2)
    expect(geometry.ratios.story).toBeCloseTo(1, 1)
    expect(geometry.ratios.solution).toBeCloseTo(6 / 5, 1)
    expect(geometry.ratios.style).toBeCloseTo(4 / 3, 1)
    expect(geometry.ratios.process).toBeCloseTo(16 / 9, 1)
    expect(geometry.ratios.testimonial).toBeCloseTo(16 / 9, 1)
    expect(geometry.styleCardsEqual).toBe(true)
    expect(geometry.processCardsEqual).toBe(true)
    expect(geometry.testimonialCardsEqual).toBe(true)
    expect(geometry.testimonialEdgeGap).toBeLessThanOrEqual(1)
    expect(geometry.noHorizontalOverflow).toBe(true)
    expect(geometry.headingFits).toBe(true)
    expect(geometry.imageObjectFit).toBe('cover')
    expect(geometry.imageObjectPosition).toBe('32% 44%')
    expect(geometry.frameWidthShare).toBeGreaterThan(0.28)
    expect(geometry.noteInsideViewport).toBe(true)
    expect(geometry.primaryActionHeight).toBeLessThan(60)
    expect(geometry.solutionGridMinHeight).toBe('0px')
    expect(geometry.solutionImageObjectFit).toBe('cover')
    expect(geometry.solutionImageObjectPosition).toBe('61% 37%')
    expect(geometry.solutionCaptionInsideImage).toBe(true)
    expect(geometry.solutionActionHeight).toBeLessThan(60)
    if (viewport.width >= 1024) {
      expect(geometry.solutionGridHeight).toBeLessThan(600)
      expect(geometry.solutionVisualWidth).toBeLessThanOrEqual(511)
      expect(geometry.solutionBalanceGap).toBeLessThan(150)
    }
    if (viewport.width >= 1280) expect(geometry.solutionHeadingLines).toBeLessThanOrEqual(2.2)
    else expect(geometry.solutionHeadingLines).toBeLessThanOrEqual(3.2)
    expect(geometry.solutionBenefitsShareRow).toBe(viewport.width >= 768)
    if (viewport.width < 768) {
      expect(geometry.textBeforeImage).toBe(true)
      expect(geometry.heroHeight).toBeLessThan(900)
    }
    if (viewport.width <= 820) {
      expect(geometry.solutionTextBeforeImage).toBe(true)
      expect(geometry.solutionGridHeight).toBeLessThan(950)
    }
    if (viewport.width === 1440 || viewport.width === 390) await page.locator('.home-style-grid').screenshot({ path: `../artifacts/home-style-grid-${viewport.width}.png` })
    await page.locator('.home-solution-grid').screenshot({ path: `../artifacts/home-solution-${viewport.width}.png` })
  }
})

test('anh ngang doc vuong khong thay doi geometry homepage', async ({ page }) => {
  test.setTimeout(90_000)
  let activeImagePath = '/e2e/source-1600x900.svg'
  await page.route('**/e2e/source-*.svg', (route) => {
    const match = route.request().url().match(/source-(\d+)x(\d+)\.svg/)
    const width = Number(match?.[1] ?? 1600)
    const height = Number(match?.[2] ?? 900)
    route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#d7aab5"/><circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 4}" fill="#6f3f4d"/></svg>` })
  })
  await page.route('**/api/v1/home-page', async (route) => {
    const data = {
      ...homeContent,
      hero_image_path: activeImagePath,
      brand_story_image_path: activeImagePath,
      sections: {
        ...homeContent.sections,
        solutions: { ...homeContent.sections.solutions, image_path: activeImagePath },
        styles: { ...homeContent.sections.styles, items: homeContent.sections.styles.items.map((item) => ({ ...item, image_path: activeImagePath })) },
        process: { ...homeContent.sections.process, steps: homeContent.sections.process.steps.map((step) => ({ ...step, image_path: activeImagePath })) },
        testimonials: { ...homeContent.sections.testimonials, items: homeContent.sections.testimonials.items.map((item) => ({ ...item, image_path: activeImagePath })) },
      },
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data }) })
  })

  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport)
    for (const [width, height] of [[1600, 900], [900, 1600], [1000, 1000], [2400, 800], [800, 2400], [1920, 1080], [1080, 1920]]) {
      activeImagePath = `/e2e/source-${width}x${height}.svg`
      const contentResponse = page.waitForResponse((response) => response.url().endsWith('/api/v1/home-page') && response.ok())
      await page.goto('/')
      await contentResponse
      await expect(page.locator('.home-solution-art img')).toBeVisible()
      await expect(page.locator('.home-process-media')).toHaveCount(homeContent.sections.process.steps.length)
      await expect(page.locator(viewport.width <= 640 ? '.home-testimonial-mobile .home-testimonial-media' : '.home-testimonial-grid .home-testimonial-media').first()).toBeVisible()
      const geometry = await page.evaluate((isMobile) => {
        const ratio = (selector: string) => { const bounds = document.querySelector(selector)!.getBoundingClientRect(); return bounds.width / bounds.height }
        const sizes = (selector: string) => [...document.querySelectorAll(selector)].map((element) => { const bounds = element.getBoundingClientRect(); return [bounds.width, bounds.height] })
        const styleCards = sizes('.home-style-card')
        const objectFits = [...document.querySelectorAll('.fixed-media-frame img')].map((image) => getComputedStyle(image).objectFit)
        return {
          ratios: {
            hero: ratio('.home-hero-image-frame'),
            story: ratio('.home-story-image'),
            solution: ratio('.home-solution-art'),
            inspiration: ratio('.home-style-card'),
            process: ratio('.home-process-media'),
            testimonial: ratio(isMobile ? '.home-testimonial-mobile .home-testimonial-media' : '.home-testimonial-grid .home-testimonial-media'),
          },
          styleCardsEqual: styleCards.every((size) => Math.abs(size[0] - styleCards[0][0]) <= 1 && Math.abs(size[1] - styleCards[0][1]) <= 1),
          objectFits,
        }
      }, viewport.width <= 640)
      expect(geometry.ratios.hero).toBeCloseTo(16 / 9, 2)
      expect(geometry.ratios.story).toBeCloseTo(1, 2)
      expect(geometry.ratios.solution).toBeCloseTo(6 / 5, 2)
      expect(geometry.ratios.inspiration).toBeCloseTo(4 / 3, 2)
      expect(geometry.ratios.process).toBeCloseTo(16 / 9, 2)
      expect(geometry.ratios.testimonial).toBeCloseTo(16 / 9, 2)
      expect(geometry.styleCardsEqual).toBe(true)
      expect(geometry.objectFits.every((value) => value === 'cover')).toBe(true)
    }
  }
})
