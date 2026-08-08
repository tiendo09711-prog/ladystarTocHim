import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 60_000 })

test('trang bản tin hiển thị heading và không tràn ngang', async ({ page }) => {
  await page.goto('/tin-tuc')
  await expect(page).toHaveTitle(/Bản tin LADYSTARS/)
  await expect(page.getByRole('heading', { name: 'Bản tin LADYSTARS' })).toBeVisible()
  await expect(page.locator('body')).toContainText(/Cẩm nang|bản tin/i)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})

test('trang bản tin mobile không lỗi và có trạng thái rỗng hoặc danh sách', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/tin-tuc')
  await expect(page.getByRole('heading', { name: 'Bản tin LADYSTARS' })).toBeVisible()
  await page.waitForLoadState('networkidle')
  await expect.poll(async () => {
    const cards = await page.locator('.news-card').count()
    const empty = await page.getByText('Chưa có bản tin').count()
    return cards > 0 || empty > 0
  }, { timeout: 15_000 }).toBeTruthy()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})

test('bài viết đã xuất bản mở được trang chi tiết', async ({ page, request }) => {
  const response = await request.get('http://localhost:8000/api/v1/news')
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  const articles = body.data.data as Array<{ slug: string; title: string }>
  test.skip(articles.length === 0, 'Chưa có bài viết published để kiểm tra chi tiết')
  await page.goto(`/tin-tuc/${articles[0].slug}`)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(articles[0].title)
  await expect(page.getByRole('link', { name: /Quay lại bản tin/ })).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})

test('slug không tồn tại hiển thị trang 404', async ({ page }) => {
  await page.goto('/tin-tuc/bai-viet-khong-ton-tai-e2e')
  await expect(page.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible()
})
