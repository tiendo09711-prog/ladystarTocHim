import type { LucideIcon } from 'lucide-react'
import type { User } from '../types'
import { hasRequirement, isSuperAdmin } from '../features/auth/permissions'
import {
  BarChart3,
  BookOpen,
  Boxes,
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  Gift,
  History,
  House,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  Newspaper,
  Package,
  PanelsTopLeft,
  RotateCcw,
  Scissors,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Tags,
  TicketPercent,
  Users,
  Warehouse,
} from 'lucide-react'

export type AdminNavigationItem = {
  id: string
  label: string
  path: string
  icon: LucideIcon
  permission?: string | string[]
  permissionMode?: 'any' | 'all'
  superAdminOnly?: boolean
}

export type AdminNavigationGroup = {
  id: string
  label: string
  icon: LucideIcon
  items: AdminNavigationItem[]
  separated?: boolean
}

export const adminDashboardItem: AdminNavigationItem = {
  id: 'dashboard',
  label: 'Dashboard',
  path: '/admin/dashboard',
  icon: LayoutDashboard,
  permission: 'dashboard.view',
}

export const adminNavigationGroups: AdminNavigationGroup[] = [
  {
    id: 'sales',
    label: 'Bán hàng',
    icon: ShoppingBag,
    items: [
      { id: 'orders', label: 'Đơn hàng', path: '/admin/orders', icon: ShoppingBag, permission: 'orders.view' },
      { id: 'returns', label: 'Đổi / Trả', path: '/admin/returns', icon: RotateCcw, permission: 'returns.view' },
      { id: 'warranties', label: 'Bảo hành', path: '/admin/warranties', icon: ShieldCheck, permission: 'warranties.view' },
      { id: 'appointments', label: 'Lịch hẹn', path: '/admin/appointments', icon: CalendarDays, permission: 'appointments.view' },
      { id: 'customers', label: 'Khách hàng', path: '/admin/customers', icon: Users, permission: 'customers.view' },
      { id: 'consultation-requests', label: 'Yêu cầu tư vấn', path: '/admin/consultation-requests', icon: ClipboardList, permission: 'consultations.view' },
    ],
  },
  {
    id: 'products-inventory',
    label: 'Sản phẩm & Kho',
    icon: Warehouse,
    items: [
      { id: 'products', label: 'Sản phẩm', path: '/admin/products', icon: Package, permission: 'products.view' },
      { id: 'categories', label: 'Danh mục', path: '/admin/categories', icon: Tags, permission: 'catalog.view' },
      { id: 'brands', label: 'Thương hiệu', path: '/admin/brands', icon: Tags, permission: 'catalog.view' },
      { id: 'attributes', label: 'Thuộc tính', path: '/admin/attributes', icon: Boxes, permission: 'catalog.view' },
      { id: 'branches', label: 'Chi nhánh', path: '/admin/branches', icon: Warehouse, permission: 'branches.view' },
      { id: 'inventory', label: 'Tồn kho', path: '/admin/inventory', icon: ClipboardList, permission: 'inventory.view' },
      { id: 'inventory-transactions', label: 'Lịch sử kho', path: '/admin/inventory/transactions', icon: History, permission: 'inventory.view' },
      { id: 'barcodes', label: 'Barcode', path: '/admin/barcodes', icon: Boxes, permission: 'barcodes.view' },
      { id: 'import-export', label: 'Import / Export', path: '/admin/import-export', icon: FileSpreadsheet, permission: ['import.products', 'export.products', 'export.orders', 'export.inventory', 'export.customers'], permissionMode: 'any' },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: Gift,
    items: [
      { id: 'coupons', label: 'Mã giảm giá', path: '/admin/coupons', icon: TicketPercent, permission: 'coupons.view' },
      { id: 'promotions', label: 'Ưu đãi', path: '/admin/promotions', icon: Gift, permission: 'promotions.view' },
    ],
  },
  {
    id: 'customer-feedback',
    label: 'Khách hàng & phản hồi',
    icon: Users,
    items: [
      { id: 'reviews', label: 'Đánh giá', path: '/admin/reviews', icon: BarChart3, permission: 'reviews.view' },
    ],
  },
  {
    id: 'website-content',
    label: 'Nội dung website',
    icon: PanelsTopLeft,
    items: [
      { id: 'home-page', label: 'Trang chủ', path: '/admin/home-page', icon: House, permission: 'content.home.manage' },
      { id: 'store-page', label: 'Trang hệ thống cửa hàng', path: '/admin/store-page', icon: MapPin, permission: 'content.store.manage' },
      { id: 'contact-page', label: 'Trang liên hệ', path: '/admin/contact-page', icon: MessageCircle, permission: 'content.contact.manage' },
      { id: 'about', label: 'Giới thiệu', path: '/admin/about', icon: PanelsTopLeft, permission: 'content.about.manage' },
      { id: 'catalog-content', label: 'Nội dung sản phẩm', path: '/admin/catalog-content', icon: PanelsTopLeft, permission: 'content.catalog.manage' },
      { id: 'services', label: 'Dịch vụ', path: '/admin/services', icon: Scissors, permission: 'services.view' },
      { id: 'news', label: 'Tin tức', path: '/admin/news', icon: Newspaper, permission: 'content.news.manage' },
      { id: 'guides', label: 'Hướng dẫn', path: '/admin/guides', icon: BookOpen, permission: 'content.guides.manage' },
      { id: 'policies', label: 'Chính sách', path: '/admin/policies', icon: PanelsTopLeft, permission: 'content.policies.manage' },
    ],
  },
  {
    id: 'reports',
    label: 'Báo cáo',
    icon: BarChart3,
    items: [
      { id: 'reports', label: 'Báo cáo', path: '/admin/reports', icon: BarChart3, permission: 'reports.view' },
    ],
  },
  {
    id: 'system',
    label: 'Hệ thống',
    icon: Settings,
    separated: true,
    items: [
      { id: 'settings', label: 'Cài đặt', path: '/admin/settings', icon: Settings, permission: 'settings.view' },
      { id: 'staff', label: 'Nhân viên', path: '/admin/staff', icon: Users, superAdminOnly: true },
      { id: 'staff-roles', label: 'Vai trò & quyền', path: '/admin/staff-roles', icon: ShieldCheck, superAdminOnly: true },
      { id: 'audit-logs', label: 'Nhật ký hoạt động', path: '/admin/audit-logs', icon: History, permission: 'audit.view' },
    ],
  },
]

export function isAdminRouteActive(pathname: string, itemPath: string) {
  const normalizedPathname = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return normalizedPathname === itemPath || normalizedPathname.startsWith(`${itemPath}/`)
}

export function getActiveAdminNavigation(pathname: string) {
  const candidates = [
    { item: adminDashboardItem, groupId: null },
    ...adminNavigationGroups.flatMap((group) => group.items.map((item) => ({ item, groupId: group.id }))),
  ]

  return candidates
    .filter(({ item }) => isAdminRouteActive(pathname, item.path))
    .sort((left, right) => right.item.path.length - left.item.path.length)[0] ?? null
}

export function isAdminNavigationItemAllowed(item: AdminNavigationItem, user: User | null | undefined) {
  if (item.superAdminOnly) return isSuperAdmin(user)
  return hasRequirement(user, item.permission, item.permissionMode)
}

export function getVisibleAdminNavigation(user: User | null | undefined) {
  const dashboard = isAdminNavigationItemAllowed(adminDashboardItem, user) ? adminDashboardItem : null
  const groups = adminNavigationGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => isAdminNavigationItemAllowed(item, user)) }))
    .filter((group) => group.items.length > 0)

  return { dashboard, groups }
}

export function getFirstAllowedAdminPath(user: User | null | undefined) {
  const visible = getVisibleAdminNavigation(user)
  return visible.dashboard?.path ?? visible.groups.flatMap((group) => group.items)[0]?.path ?? null
}
