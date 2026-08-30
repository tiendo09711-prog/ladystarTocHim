import { describe, expect, it } from 'vitest'
import type { User } from '../../types'
import { can, canAll, canAny, hasRequirement, isBackofficeUser, isSuperAdmin } from './permissions'

const customer = { id: 1, name: 'Customer', email: 'customer@test.local', role: 'user', status: 'active' } as User
const staff = { ...customer, id: 2, role: 'staff', permissions: ['orders.view', 'customers.view'] } as User
const admin = { ...customer, id: 3, role: 'admin', permissions: [] } as User

describe('permission helpers', () => {
  it('cho Super Admin bypass toàn bộ permission', () => {
    expect(isSuperAdmin(admin)).toBe(true)
    expect(can(admin, 'settings.manage')).toBe(true)
  })

  it('chỉ cho Staff dùng permission hiệu lực', () => {
    expect(isBackofficeUser(staff)).toBe(true)
    expect(can(staff, 'orders.view')).toBe(true)
    expect(can(staff, 'orders.status.manage')).toBe(false)
    expect(canAny(staff, ['settings.view', 'customers.view'])).toBe(true)
    expect(canAll(staff, ['orders.view', 'customers.view'])).toBe(true)
    expect(canAll(staff, ['orders.view', 'orders.status.manage'])).toBe(false)
  })

  it('không cấp permission cho Customer', () => {
    expect(isBackofficeUser(customer)).toBe(false)
    expect(hasRequirement(customer, 'orders.view')).toBe(false)
  })
})
