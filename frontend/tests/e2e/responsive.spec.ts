import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 } })

test('menu cửa hàng hoạt động trên mobile', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Mở menu' }).click()
  await expect(page.getByRole('link', { name: 'Hair system' })).toBeVisible()
})
