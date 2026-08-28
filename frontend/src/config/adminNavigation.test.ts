import { describe, expect, it } from 'vitest'
import type { User } from '../types'
import { adminDashboardItem, adminNavigationGroups, getActiveAdminNavigation, getVisibleAdminNavigation, isAdminRouteActive } from './adminNavigation'

describe('adminNavigation', () => {
  it('matches exact and nested admin routes by segment', () => {
    expect(isAdminRouteActive('/admin/products', '/admin/products')).toBe(true)
    expect(isAdminRouteActive('/admin/products/123/edit', '/admin/products')).toBe(true)
    expect(isAdminRouteActive('/admin/products-content', '/admin/products')).toBe(false)
  })

  it('uses the most specific menu item for overlapping routes', () => {
    const activeNavigation = getActiveAdminNavigation('/admin/inventory/transactions')

    expect(activeNavigation?.item.id).toBe('inventory-transactions')
    expect(activeNavigation?.groupId).toBe('products-inventory')
  })

  it('maps detail and settings routes to their parent menu groups', () => {
    expect(getActiveAdminNavigation('/admin/orders/42')?.item.id).toBe('orders')
    expect(getActiveAdminNavigation('/admin/products/42/edit')?.item.id).toBe('products')
    expect(getActiveAdminNavigation('/admin/news/settings')?.item.id).toBe('news')
    expect(getActiveAdminNavigation('/admin/promotions/42/edit')?.groupId).toBe('marketing')
  })

  it('includes brand management in products and inventory', () => {
    expect(getActiveAdminNavigation('/admin/brands')?.item.label).toBe('Thương hiệu')
    expect(getActiveAdminNavigation('/admin/brands')?.groupId).toBe('products-inventory')
  })

  it('keeps every existing admin menu route available', () => {
    const configuredPaths = [adminDashboardItem, ...adminNavigationGroups.flatMap((group) => group.items)]
      .map((item) => item.path)
      .sort()

    expect(configuredPaths).toEqual([
      '/admin/about',
      '/admin/appointments',
      '/admin/attributes',
      '/admin/audit-logs',
      '/admin/barcodes',
      '/admin/branches',
      '/admin/brands',
      '/admin/catalog-content',
      '/admin/categories',
      '/admin/consultation-requests',
      '/admin/contact-page',
      '/admin/coupons',
      '/admin/customers',
      '/admin/dashboard',
      '/admin/guides',
      '/admin/home-page',
      '/admin/import-export',
      '/admin/inventory',
      '/admin/inventory/transactions',
      '/admin/news',
      '/admin/orders',
      '/admin/products',
      '/admin/promotions',
      '/admin/reports',
      '/admin/returns',
      '/admin/reviews',
      '/admin/services',
      '/admin/settings',
      '/admin/staff',
      '/admin/staff-roles',
      '/admin/store-page',
      '/admin/warranties',
    ])
  })

  it('lọc item và bỏ group rỗng cho Staff', () => {
    const user = { id: 2, name: 'Sales', email: 'sales@test.local', role: 'staff', status: 'active', permissions: ['orders.view'] } as User
    const visible = getVisibleAdminNavigation(user)

    expect(visible.dashboard).toBeNull()
    expect(visible.groups.map((group) => group.id)).toEqual(['sales'])
    expect(visible.groups[0].items.map((item) => item.id)).toEqual(['orders'])
  })

  it('hiện Import / Export khi Staff có bất kỳ permission liên quan', () => {
    const user = { id: 3, name: 'Exporter', email: 'export@test.local', role: 'staff', status: 'active', permissions: ['export.customers'] } as User
    const visible = getVisibleAdminNavigation(user)

    expect(visible.groups.flatMap((group) => group.items).map((item) => item.id)).toEqual(['import-export'])
  })

  it('giữ toàn bộ navigation cho Super Admin', () => {
    const admin = { id: 1, name: 'Admin', email: 'admin@test.local', role: 'admin', status: 'active', permissions: [] } as User
    const visible = getVisibleAdminNavigation(admin)

    expect(visible.dashboard?.id).toBe('dashboard')
    expect(visible.groups.flatMap((group) => group.items)).toHaveLength(adminNavigationGroups.flatMap((group) => group.items).length)
  })
})
