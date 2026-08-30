import { expect, test, type Page } from '@playwright/test'

test.setTimeout(90_000)

async function loginAdmin(page: Page) {
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill('admin@namhair.local')
  await page.getByLabel('Mật khẩu').fill(process.env.E2E_ADMIN_PASSWORD!)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).toHaveURL(/admin\/dashboard$/)
}

async function api(page: Page, method: string, path: string, data?: unknown) {
  return page.evaluate(async ({ method, path, data }) => {
    const token = document.cookie.split('; ').find((cookie) => cookie.startsWith('XSRF-TOKEN='))?.split('=')[1]
    const response = await fetch(`/api/v1/${path}`, {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {}),
      },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    })
    return { status: response.status, body: await response.json() }
  }, { method, path, data })
}

test('Audit ghi mutation, xem được chi tiết và không lộ password', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await loginAdmin(page)

  const rolesResponse = await api(page, 'GET', 'admin/staff-roles')
  expect(rolesResponse.status).toBe(200)
  const salesRole = (rolesResponse.body.data as Array<{ id: number; slug: string }>).find((role) => role.slug === 'sales')
  expect(salesRole).toBeTruthy()

  const suffix = `${Date.now()}`
  const email = `phase4.audit.${suffix}@example.test`
  const secret = 'AuditSecret@123'
  const createResponse = await api(page, 'POST', 'admin/staff', {
    name: `Audit Staff ${suffix}`,
    email,
    phone: `08${suffix.slice(-8)}`,
    password: secret,
    password_confirmation: secret,
    status: 'active',
    role_ids: [salesRole!.id],
  })
  expect(createResponse.status).toBe(201)

  await page.goto('/admin/audit-logs')
  await expect(page.getByRole('heading', { name: 'Nhật ký hoạt động' })).toBeVisible()
  await page.getByPlaceholder('Action', { exact: true }).fill('staff.created')
  const auditRow = page.getByRole('row').filter({ hasText: 'staff.created' }).first()
  await expect(auditRow).toBeVisible()
  const [detailResponse] = await Promise.all([
    page.waitForResponse((response) => /\/api\/v1\/admin\/audit-logs\/\d+$/.test(response.url())),
    auditRow.getByLabel('Xem chi tiết audit').click(),
  ])
  expect(detailResponse.status()).toBe(200)
  await expect(page.getByRole('button', { name: 'Đóng chi tiết' })).toBeVisible()
  await expect(page.locator('pre').filter({ hasText: email })).toBeVisible()
  await expect(page.getByText(secret, { exact: false })).toHaveCount(0)
  await expect(page.locator('pre').filter({ hasText: 'password' })).toHaveCount(0)

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('button', { name: 'Đóng chi tiết' })).toBeVisible()
  await page.getByRole('button', { name: 'Đóng chi tiết' }).click()
  await expect(page.getByRole('heading', { name: 'Nhật ký hoạt động' })).toBeVisible()
})
