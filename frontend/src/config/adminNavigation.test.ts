import { describe, expect, it } from 'vitest'
import type { User } from '../types'
import { getVisibleAdminNavigation } from './adminNavigation'

const base = { id: 1, name: 'Staff', email: 'staff@example.com', role: 'staff', status: 'active' } as User

describe('admin report navigation', () => {
  it('chỉ hiển thị Reports khi có reports.view', () => {
    const dashboardOnly = getVisibleAdminNavigation({ ...base, permissions: ['dashboard.view'] })
    const reportUser = getVisibleAdminNavigation({ ...base, permissions: ['reports.view'] })

    expect(dashboardOnly.groups.flatMap((group) => group.items).some((item) => item.path === '/admin/reports')).toBe(false)
    expect(reportUser.groups.flatMap((group) => group.items).some((item) => item.path === '/admin/reports')).toBe(true)
  })
})
