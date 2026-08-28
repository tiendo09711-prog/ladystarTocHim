import type { LucideIcon } from 'lucide-react'
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
  permission?: string
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
}

export const adminNavigationGroups: AdminNavigationGroup[] = [
  {
    id: 'sales',
    label: 'Bán hàng',
    icon: ShoppingBag,
    items: [
      { id: 'orders', label: 'Đơn hàng', path: '/admin/orders', icon: ShoppingBag },
      { id: 'returns', label: 'Đổi / Trả', path: '/admin/returns', icon: RotateCcw },
      { id: 'warranties', label: 'Bảo hành', path: '/admin/warranties', icon: ShieldCheck },
      { id: 'appointments', label: 'Lịch hẹn', path: '/admin/appointments', icon: CalendarDays },
      { id: 'customers', label: 'Khách hàng', path: '/admin/customers', icon: Users },
      { id: 'consultation-requests', label: 'Yêu cầu tư vấn', path: '/admin/consultation-requests', icon: ClipboardList },
    ],
  },
  {
    id: 'products-inventory',
    label: 'Sản phẩm & Kho',
    icon: Warehouse,
    items: [
      { id: 'products', label: 'Sản phẩm', path: '/admin/products', icon: Package },
      { id: 'categories', label: 'Danh mục', path: '/admin/categories', icon: Tags },
      { id: 'brands', label: 'Thương hiệu', path: '/admin/brands', icon: Tags },
      { id: 'attributes', label: 'Thuộc tính', path: '/admin/attributes', icon: Boxes },
      { id: 'branches', label: 'Chi nhánh', path: '/admin/branches', icon: Warehouse },
      { id: 'inventory', label: 'Tồn kho', path: '/admin/inventory', icon: ClipboardList },
      { id: 'inventory-transactions', label: 'Lịch sử kho', path: '/admin/inventory/transactions', icon: History },
      { id: 'barcodes', label: 'Barcode', path: '/admin/barcodes', icon: Boxes },
      { id: 'import-export', label: 'Import / Export', path: '/admin/import-export', icon: FileSpreadsheet },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: Gift,
    items: [
      { id: 'coupons', label: 'Mã giảm giá', path: '/admin/coupons', icon: TicketPercent },
      { id: 'promotions', label: 'Ưu đãi', path: '/admin/promotions', icon: Gift },
    ],
  },
  {
    id: 'customer-feedback',
    label: 'Khách hàng & phản hồi',
    icon: Users,
    items: [
      { id: 'reviews', label: 'Đánh giá', path: '/admin/reviews', icon: BarChart3 },
    ],
  },
  {
    id: 'website-content',
    label: 'Nội dung website',
    icon: PanelsTopLeft,
    items: [
      { id: 'home-page', label: 'Trang chủ', path: '/admin/home-page', icon: House },
      { id: 'store-page', label: 'Trang hệ thống cửa hàng', path: '/admin/store-page', icon: MapPin },
      { id: 'contact-page', label: 'Trang liên hệ', path: '/admin/contact-page', icon: MessageCircle },
      { id: 'about', label: 'Giới thiệu', path: '/admin/about', icon: PanelsTopLeft },
      { id: 'catalog-content', label: 'Nội dung sản phẩm', path: '/admin/catalog-content', icon: PanelsTopLeft },
      { id: 'services', label: 'Dịch vụ', path: '/admin/services', icon: Scissors },
      { id: 'news', label: 'Tin tức', path: '/admin/news', icon: Newspaper },
      { id: 'guides', label: 'Hướng dẫn', path: '/admin/guides', icon: BookOpen },
    ],
  },
  {
    id: 'reports',
    label: 'Báo cáo',
    icon: BarChart3,
    items: [
      { id: 'reports', label: 'Báo cáo', path: '/admin/reports', icon: BarChart3 },
    ],
  },
  {
    id: 'system',
    label: 'Hệ thống',
    icon: Settings,
    separated: true,
    items: [
      { id: 'settings', label: 'Cài đặt', path: '/admin/settings', icon: Settings },
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
