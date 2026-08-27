import { describe, expect, it } from 'vitest'
import { adminDashboardItem, adminNavigationGroups, getActiveAdminNavigation, isAdminRouteActive } from './adminNavigation'

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

  it('keeps every existing admin menu route available', () => {
    const configuredPaths = [adminDashboardItem, ...adminNavigationGroups.flatMap((group) => group.items)]
      .map((item) => item.path)
      .sort()

    expect(configuredPaths).toEqual([
      '/admin/about',
      '/admin/attributes',
      '/admin/barcodes',
      '/admin/branches',
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
      '/admin/reviews',
      '/admin/services',
      '/admin/settings',
      '/admin/store-page',
    ])
  })
})
