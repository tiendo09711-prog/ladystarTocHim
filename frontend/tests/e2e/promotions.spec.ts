import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 90_000 })

async function loginAdmin(page: import('@playwright/test').Page) {
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill('admin@namhair.local')
  await page.getByLabel('Mật khẩu').fill(process.env.E2E_ADMIN_PASSWORD!)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).toHaveURL(/admin\/dashboard/, { timeout: 20_000 })
}

async function cleanupE2ePromotions(page: import('@playwright/test').Page) {
  const response = await page.request.get('/api/v1/admin/promotions', { params: { search: 'Ưu đãi E2E' } })
  if (!response.ok()) return
  const payload = await response.json()
  const articles = payload.data?.data ?? []
  await Promise.all(articles.filter((article: { title?: string }) => article.title?.startsWith('Ưu đãi E2E')).map((article: { id: number }) => page.request.delete(`/api/v1/admin/promotions/${article.id}`)))
}

test('trang ưu đãi desktop hiển thị đầy đủ và không tràn ngang', async ({ page }) => {
  await page.goto('/uu-dai')
  await expect(page.getByRole('heading', { name: 'Ưu đãi dành riêng cho bạn' })).toBeVisible({ timeout: 20_000 })
  await expect(page).toHaveTitle(/Ưu đãi/)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  await page.screenshot({ path: '../artifacts/promotions-desktop.png', fullPage: true })
})

test('trang ưu đãi mobile giữ bố cục và không tràn ngang', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/uu-dai')
  await expect(page.getByRole('heading', { name: 'Ưu đãi dành riêng cho bạn' })).toBeVisible({ timeout: 20_000 })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  await page.screenshot({ path: '../artifacts/promotions-mobile.png', fullPage: true })
})

test('admin tạo ưu đãi theo sản phẩm, khách xem điều kiện và xóa ưu đãi', async ({ page }) => {
  await loginAdmin(page)
  await cleanupE2ePromotions(page)
  const suffix = Date.now().toString().slice(-7)
  const title = `Ưu đãi E2E ${suffix}`
  const slug = `uu-dai-e2e-${suffix}`

  await page.goto('/admin/promotions/create')
  await page.getByLabel('Tiêu đề').fill(title)
  await page.getByLabel('Slug').fill(slug)
  await page.getByLabel('Tóm tắt').fill('Ưu đãi được tạo để kiểm tra luồng quản trị.')
  await page.getByRole('textbox', { name: 'Nội dung', exact: true }).fill('Nội dung ưu đãi E2E đầy đủ.')
  await page.getByLabel('Nhãn ưu đãi').fill('Quà tặng E2E')
  await page.getByLabel('Điều kiện kích hoạt ưu đãi').fill('Mua đúng sản phẩm được chọn và không cộng dồn chương trình khác.')
  const productSection = page.locator('section').filter({ hasText: 'Sản phẩm được áp dụng' })
  const productCheckbox = productSection.getByRole('checkbox').first()
  const productLabel = await productCheckbox.locator('xpath=..').locator('strong').innerText()
  await productCheckbox.check()
  await expect(productSection.getByText('Đã chọn 1 sản phẩm.')).toBeVisible()
  await page.getByRole('button', { name: 'Xuất bản' }).click()
  await expect(page).toHaveURL(/admin\/promotions$/)
  await expect(page.getByText(title)).toBeVisible()

  await page.goto('/uu-dai')
  await expect(page.getByRole('heading', { name: title })).toBeVisible()
  await expect(page.getByRole('link', { name: new RegExp(title) })).toHaveAttribute('href', `/uu-dai/${slug}`)
  await page.goto(`/uu-dai/${slug}`)
  await expect(page).toHaveURL(new RegExp(`/uu-dai/${slug}$`))
  await expect(page.getByRole('heading', { name: title })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Điều kiện áp dụng' })).toBeVisible()
  await expect(page.getByText('Mua đúng sản phẩm được chọn và không cộng dồn chương trình khác.')).toBeVisible()
  await expect(page.getByRole('link', { name: new RegExp(productLabel) })).toBeVisible()

  await page.getByRole('link', { name: new RegExp(productLabel) }).click()
  await expect(page.getByRole('heading', { name: productLabel })).toBeVisible()

  await page.goto('/admin/promotions')
  const row = page.getByRole('row').filter({ hasText: title })
  page.once('dialog', (dialog) => dialog.accept())
  await row.getByRole('button', { name: `Xóa ${title}` }).click()
  await expect(page.getByText('Đã xóa ưu đãi.')).toBeVisible()
  await cleanupE2ePromotions(page)
})

test('admin chỉnh tiêu đề trang ưu đãi và khôi phục lại', async ({ page }) => {
  await loginAdmin(page)
  await page.goto('/admin/promotions/settings')
  const titleInput = page.getByLabel('Tiêu đề trang')
  const originalTitle = await titleInput.inputValue()
  const updatedTitle = `${originalTitle} E2E`
  await titleInput.fill(updatedTitle)
  await page.getByRole('button', { name: 'Lưu thiết lập' }).click()
  await expect(page.getByText('Đã lưu thiết lập trang ưu đãi.')).toBeVisible()
  await page.goto('/uu-dai')
  await expect(page.getByRole('heading', { name: updatedTitle })).toBeVisible({ timeout: 20_000 })
  await page.goto('/admin/promotions/settings')
  await page.getByLabel('Tiêu đề trang').fill(originalTitle)
  await page.getByRole('button', { name: 'Lưu thiết lập' }).click()
  await expect(page.getByText('Đã lưu thiết lập trang ưu đãi.')).toBeVisible()
})
