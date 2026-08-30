import { expect, test } from '@playwright/test'

function containsKey(value: unknown, forbidden: string): boolean {
  if (!value || typeof value !== 'object') return false
  if (Array.isArray(value)) return value.some((item) => containsKey(item, forbidden))
  const record = value as Record<string, unknown>
  return Object.prototype.hasOwnProperty.call(record, forbidden) || Object.values(record).some((item) => containsKey(item, forbidden))
}

test('production hardening: empty admin login and public products hide cost price', async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/admin/login')
  await expect(page.getByLabel('Email')).toHaveValue('')
  await expect(page.getByLabel('Mật khẩu')).toHaveValue('')

  const response = await request.get('http://127.0.0.1:8011/api/v1/products')
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  expect(containsKey(body, 'cost_price')).toBe(false)
  const slug = body.data.data[0].slug as string
  await page.goto(`/san-pham/${slug}`)
  await expect(page.locator('body')).not.toContainText('cost_price')
})

test('guest tracking works while registered order stays private', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const products = await (await request.get('http://127.0.0.1:8011/api/v1/products')).json()
  const variantId = products.data.data[0].variants[0].id as number
  const phone = `09${String(Date.now()).slice(-8)}`
  const placed = await request.post('http://127.0.0.1:8011/api/v1/guest-checkout/place-order', { data: {
    customer_name: 'Guest Phase 5', customer_email: `phase5.${Date.now()}@example.test`, customer_phone: phone,
    province: 'Hà Nội', district: 'Ba Đình', ward: 'Điện Biên', shipping_address: '1 Đường Mẫu',
    payment_method: 'cod', items: [{ product_variant_id: variantId, quantity: 1 }],
  } })
  expect(placed.ok()).toBeTruthy()
  const orderNumber = (await placed.json()).data.order_number as string

  await page.goto(`/tra-cuu-don-hang?order=${orderNumber}`)
  await page.getByLabel('Số điện thoại').fill(phone)
  await page.getByRole('button', { name: 'Tra cứu đơn hàng' }).click()
  await expect(page.getByRole('heading', { name: orderNumber })).toBeVisible()

  await page.goto('/tra-cuu-don-hang?order=NH-DEMO-001')
  await page.getByLabel('Số điện thoại').fill('0900000002')
  await page.getByRole('button', { name: 'Tra cứu đơn hàng' }).click()
  await expect(page.getByText('Không tìm thấy đơn hàng phù hợp.')).toBeVisible()
})
