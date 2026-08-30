import { expect, test, type Page } from '@playwright/test'

async function login(page: Page) {
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill('admin@namhair.local')
  await page.getByLabel('Mật khẩu').fill(process.env.E2E_ADMIN_PASSWORD!)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).not.toHaveURL(/admin\/login$/)
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`reports flow ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await login(page)
    await page.goto('/admin/reports')
    await expect(page.getByRole('heading', { name: 'Báo cáo & phân tích' })).toBeVisible()
    await page.getByRole('button', { name: '30 ngày' }).click()
    await expect(page.getByText('Doanh thu thuần')).toBeVisible()
    await page.getByRole('button', { name: 'Sản phẩm', exact: true }).click()
    await expect(page.getByRole('columnheader', { name: 'Sản phẩm' })).toBeVisible()
    await page.getByRole('button', { name: 'Tồn kho', exact: true }).click()
    await expect(page.getByText('Giá trị tồn kho')).toBeVisible()
    await page.getByRole('button', { name: 'Khách hàng', exact: true }).click()
    await expect(page.getByRole('columnheader', { name: 'Khách hàng' })).toBeVisible()
  })
}
