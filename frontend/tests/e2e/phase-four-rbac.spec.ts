import { expect, test, type Page } from '@playwright/test'

test.setTimeout(90_000)

async function loginBackoffice(page: Page, email: string, password: string) {
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mật khẩu').fill(password)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).not.toHaveURL(/admin\/login$/)
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

test('Super Admin tạo Staff; Staff chỉ thấy và gọi đúng permission', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await loginBackoffice(page, 'admin@namhair.local', process.env.E2E_ADMIN_PASSWORD!)

  const suffix = `${Date.now()}`
  const permissionResponse = await api(page, 'GET', 'admin/permissions')
  expect(permissionResponse.status).toBe(200)
  const allowedKeys = ['orders.view', 'customers.view', 'consultations.view', 'appointments.view']
  const permissionIds = (permissionResponse.body.data as Array<{ id: number; key: string }>).filter((permission) => allowedKeys.includes(permission.key)).map((permission) => permission.id)
  expect(permissionIds).toHaveLength(allowedKeys.length)

  const roleName = `Sales View E2E ${suffix}`
  const roleResponse = await api(page, 'POST', 'admin/staff-roles', { name: roleName, slug: `sales-view-e2e-${suffix}`, description: 'Vai trò giới hạn dùng cho Playwright Phase 4', permission_ids: permissionIds })
  expect(roleResponse.status).toBe(201)

  await page.getByRole('button', { name: 'Hệ thống', exact: true }).click()
  await page.getByRole('link', { name: 'Vai trò & quyền', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Vai trò & quyền' })).toBeVisible()
  await expect(page.getByText(roleName)).toBeVisible()

  await page.getByRole('link', { name: 'Nhân viên', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Nhân viên' })).toBeVisible()
  await page.getByRole('button', { name: 'Tạo nhân viên' }).click()
  const staffEmail = `phase4.staff.${suffix}@example.test`
  const staffPassword = 'Phase4@123456'
  await page.getByLabel('Họ tên').fill(`Staff Phase 4 ${suffix}`)
  await page.getByLabel('Email').fill(staffEmail)
  await page.getByLabel('Điện thoại').fill(`09${suffix.slice(-8)}`)
  await page.getByLabel('Mật khẩu', { exact: true }).fill(staffPassword)
  await page.getByLabel('Xác nhận mật khẩu').fill(staffPassword)
  await page.getByLabel(roleName).check()
  await page.getByRole('button', { name: 'Lưu nhân viên' }).click()
  await expect(page.getByText(staffEmail)).toBeVisible()

  await page.getByRole('button', { name: 'Đăng xuất' }).click()
  await loginBackoffice(page, staffEmail, staffPassword)
  await expect(page).toHaveURL(/admin\/orders$/)

  const sidebar = page.getByRole('navigation', { name: 'Điều hướng quản trị' })
  await expect(sidebar.getByRole('link', { name: 'Đơn hàng', exact: true })).toBeVisible()
  await expect(sidebar.getByRole('link', { name: 'Khách hàng', exact: true })).toBeVisible()
  await expect(sidebar.getByRole('link', { name: 'Yêu cầu tư vấn', exact: true })).toBeVisible()
  await expect(sidebar.getByRole('link', { name: 'Lịch hẹn', exact: true })).toBeVisible()
  await expect(sidebar.getByRole('button', { name: 'Sản phẩm & Kho', exact: true })).toHaveCount(0)
  await expect(sidebar.getByRole('button', { name: 'Hệ thống', exact: true })).toHaveCount(0)

  const ordersResponse = await api(page, 'GET', 'admin/orders')
  expect(ordersResponse.status).toBe(200)
  const orderId = (ordersResponse.body.data.data as Array<{ id: number }>)[0]?.id
  expect(orderId).toBeTruthy()
  await page.goto(`/admin/orders/${orderId}`)
  await expect(page.getByText('Chi tiết đơn', { exact: true })).toBeVisible()
  await expect(page.getByText('Cập nhật trạng thái')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Lưu thanh toán' })).toHaveCount(0)

  expect((await api(page, 'PATCH', `admin/orders/${orderId}/status`, { order_status: 'confirmed' })).status).toBe(403)
  expect((await api(page, 'GET', 'admin/settings')).status).toBe(403)
  expect((await api(page, 'GET', 'admin/staff')).status).toBe(403)
  expect((await api(page, 'GET', 'admin/audit-logs')).status).toBe(403)

  await page.goto('/admin/settings')
  await expect(page.getByText(/không có quyền truy cập/i)).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/admin/orders')
  await page.getByRole('button', { name: 'Mở menu quản trị' }).click()
  await expect(sidebar.getByRole('link', { name: 'Đơn hàng', exact: true })).toBeVisible()
  await expect(sidebar.getByRole('link', { name: 'Khách hàng', exact: true })).toBeVisible()
  await expect(sidebar.getByRole('button', { name: 'Hệ thống', exact: true })).toHaveCount(0)
})
