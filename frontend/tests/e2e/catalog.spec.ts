import { expect, test } from '@playwright/test'

test('catalog desktop supports filters, sorting, pagination, and consultation', async ({ page }) => {
  await page.goto('/san-pham')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('#catalog-grid article').first()).toBeVisible()
  await page.getByLabel('Tìm trong sản phẩm').fill('Hair')
  await expect(page).toHaveURL(/search=Hair/)
  await page.locator('select').last().selectOption('price_asc')
  await expect(page).toHaveURL(/sort=price_asc/)
  await page.getByRole('button', { name: 'Xóa bộ lọc' }).first().click()
  await expect(page).not.toHaveURL(/search=Hair/)
  await page.locator('#catalog-consultation').getByPlaceholder('Họ và tên').fill('Khách Playwright')
  await page.locator('#catalog-consultation').getByPlaceholder('Số điện thoại').fill('0900000011')
  const consultationResponse = page.waitForResponse((response) => response.url().includes('/api/v1/consultation-requests') && response.status() === 201)
  await page.locator('#catalog-consultation').getByRole('button').click()
  await consultationResponse
  await page.screenshot({ path: '../artifacts/catalog-products-desktop.png', fullPage: true })
})

test('catalog mobile filter drawer is accessible without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/san-pham')
  await page.getByRole('button', { name: /Bộ lọc/ }).click()
  const drawer = page.getByRole('dialog', { name: 'Bộ lọc sản phẩm' })
  await expect(drawer).toBeVisible()
  await expect(page.evaluate(() => document.body.style.overflow)).resolves.toBe('hidden')
  await drawer.getByRole('button', { name: 'Đóng bộ lọc' }).click()
  await expect(drawer).toBeHidden()
  await expect(page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).resolves.toBe(true)
  await page.screenshot({ path: '../artifacts/catalog-products-mobile.png', fullPage: true })
})

test('admin saves catalog content and views consultation requests', async ({ page }) => {
  await page.goto('/admin/login')
  const loginResponse = page.waitForResponse((response) => response.url().includes('/api/v1/admin/auth/login'))
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect((await loginResponse).status()).toBe(200)
  await expect(page).toHaveURL(/admin\/dashboard/)
  const contentResponse = page.waitForResponse((response) => response.url().includes('/api/v1/admin/catalog/content/products'))
  await page.goto('/admin/catalog-content')
  await expect((await contentResponse).status()).toBe(200)
  await expect(page.getByRole('heading', { name: 'Nội dung trang sản phẩm' })).toBeVisible()
  const title = page.locator('section').nth(1).getByLabel('Tiêu đề')
  await title.fill('Bộ sưu tập Playwright')
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click()
  await expect(page.getByText('Đã lưu nội dung trang sản phẩm.')).toBeVisible()
  await page.goto('/admin/consultation-requests')
  await expect(page.getByRole('heading', { name: 'Yêu cầu tư vấn' })).toBeVisible()
  await expect(page.getByText('Khách Playwright').first()).toBeVisible()
})

test('catalog và danh mục giữ khung ảnh cố định với mọi tỷ lệ nguồn', async ({ page }) => {
  const paths = ['/san-pham', '/danh-muc/phu-kien-toc-gia', '/danh-muc/dung-dich-ve-sinh']
  for (const path of paths) {
    await page.goto(path)
    await expect(page.locator('.product-card-image').first()).toBeVisible()
    await page.screenshot({ path: `../artifacts/catalog-${path.split('/').filter(Boolean).join('-')}.png`, fullPage: true })
    const geometry = await page.evaluate(() => {
      const ratio = (element: Element) => { const bounds = element.getBoundingClientRect(); return bounds.width / bounds.height }
      const heroImage = document.querySelector('main > section.mb-10 > img')
      const consultation = document.querySelector('#catalog-consultation > div:first-child')
      return {
        productRatios: [...document.querySelectorAll('.product-card-image')].map(ratio),
        productFits: [...document.querySelectorAll('.product-card-image img')].map((image) => getComputedStyle(image).objectFit),
        heroRatio: heroImage ? ratio(heroImage) : null,
        heroFit: heroImage ? getComputedStyle(heroImage).objectFit : null,
        consultationRatio: consultation ? ratio(consultation) : null,
      }
    })
    expect(geometry.productRatios.every((value) => Math.abs(value - 1) < 0.02)).toBe(true)
    expect(geometry.productFits.every((value) => value === 'cover')).toBe(true)
    if (geometry.heroRatio) expect(geometry.heroRatio).toBeCloseTo(6 / 5, 2)
    if (geometry.heroFit) expect(geometry.heroFit).toBe('cover')
    if (geometry.consultationRatio) expect(geometry.consultationRatio).toBeCloseTo(6 / 5, 2)
  }
})
