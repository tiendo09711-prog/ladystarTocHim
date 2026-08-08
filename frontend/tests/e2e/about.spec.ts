import { expect, test } from '@playwright/test'

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
  await page.getByRole('button', { name: 'Mở menu' }).click()
  await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toBeVisible()
  await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Trang chủ', exact: true }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.screenshot({ path: '../artifacts/about-mobile.png' })
})
