import { expect, test, type Page } from '@playwright/test'

const cartItem = {
  id: 'guest-10',
  product_variant_id: 10,
  quantity: 1,
  unit_price: 1500000,
  variant: {
    id: 10,
    sku: 'SKU-10',
    price: 1500000,
    current_price: 1500000,
    status: 'active',
    stock: 5,
    attributes: [],
    product: { id: 5, name: 'Sản phẩm kiểm thử', slug: 'san-pham-kiem-thu', base_sku: 'P1', status: 'active', is_featured: false, is_new: false, images: [], variants: [], rating_average: 0, reviews_count: 0 },
  },
}

async function mockPublicShell(page: Page, appointmentsEnabled: boolean) {
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ status: 401, json: { message: 'Unauthenticated.' } }))
  await page.route('**/api/v1/categories', (route) => route.fulfill({ json: { success: true, data: [] } }))
  await page.route('**/api/v1/settings/public', (route) => route.fulfill({ json: { success: true, data: { configured: true, store_name: 'Test Store', currency: 'USD', appointments_enabled: appointmentsEnabled } } }))
}

test('checkout hides COD when the database-backed method is disabled', async ({ page }) => {
  await mockPublicShell(page, true)
  await page.addInitScript((item) => localStorage.setItem('nam-hair-guest-cart', JSON.stringify([item])), cartItem)
  await page.route('**/api/v1/payment-methods', (route) => route.fulfill({ json: { success: true, data: { configured: true, shipping: { fee: 0, free_from: 0 }, cod: { enabled: false }, bank_transfer: { enabled: true, bank_name: 'Test Bank', account_number: '123' } } } }))
  await page.route('**/api/v1/guest-checkout/preview', (route) => route.fulfill({ json: { success: true, data: { subtotal: 1500000, discount_amount: 0, shipping_fee: 0, total_amount: 1500000 } } }))

  await page.goto('/thanh-toan')
  await expect(page.getByText('Thanh toán khi nhận hàng (COD)')).toHaveCount(0)
  await expect(page.getByText('Chuyển khoản ngân hàng')).toBeVisible()
})

test('appointment page stays unavailable and skips options when disabled', async ({ page }) => {
  await mockPublicShell(page, false)
  let optionsRequests = 0
  await page.route('**/api/v1/appointment-options', async (route) => { optionsRequests += 1; await route.fulfill({ json: { success: true, data: { branches: [], services: [] } } }) })

  await page.goto('/dat-lich')
  await expect(page.getByRole('heading', { name: 'Đặt lịch hiện không khả dụng' })).toBeVisible()
  expect(optionsRequests).toBe(0)
})
