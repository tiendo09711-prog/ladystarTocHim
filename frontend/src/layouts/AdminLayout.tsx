import {
  BarChart3,
  BookOpen,
  Boxes,
  ChevronLeft,
  ClipboardList,
  FileSpreadsheet,
  Gift,
  History,
  House,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Newspaper,
  Package,
  PanelsTopLeft,
  Settings,
  ShoppingBag,
  Tags,
  TicketPercent,
  Users,
  Warehouse,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../stores/AuthContext'

const menu = [
  ['Trang chủ', '/admin/home-page', House],
  ['Trang hệ thống cửa hàng', '/admin/store-page', MapPin],
  ['Trang liên hệ', '/admin/contact-page', MessageCircle],
  ['Dashboard', '/admin/dashboard', LayoutDashboard],
  ['Sản phẩm', '/admin/products', Package],
  ['Danh mục', '/admin/categories', Tags],
  ['Thuộc tính', '/admin/attributes', Boxes],
  ['Chi nhánh', '/admin/branches', Warehouse],
  ['Tồn kho', '/admin/inventory', ClipboardList],
  ['Lịch sử kho', '/admin/inventory/transactions', History],
  ['Đơn hàng', '/admin/orders', ShoppingBag],
  ['Khách hàng', '/admin/customers', Users],
  ['Đánh giá', '/admin/reviews', BarChart3],
  ['Mã giảm giá', '/admin/coupons', TicketPercent],
  ['Import / Export', '/admin/import-export', FileSpreadsheet],
  ['Barcode', '/admin/barcodes', Boxes],
  ['Báo cáo', '/admin/reports', BarChart3],
  ['Nội dung About', '/admin/about', PanelsTopLeft],
  ['Nội dung sản phẩm', '/admin/catalog-content', PanelsTopLeft],
  ['Yêu cầu tư vấn', '/admin/consultation-requests', ClipboardList],
  ['Bản tin', '/admin/news', Newspaper],
  ['Ưu đãi', '/admin/promotions', Gift],
  ['Cài đặt', '/admin/settings', Settings],
  ['Hướng dẫn', '/admin/guides', BookOpen],
] as const

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const signOut = async () => {
    await logout()
    navigate('/admin/login')
  }

  const navigation = (
    <nav className="grid gap-1">
      {menu.map(([label, to, Icon]) => (
        <NavLink
          key={to}
          to={to}
          title={label}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) => ['flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold', isActive ? 'bg-white' : 'text-emerald-50 hover:bg-white/10'].join(' ')}
          style={({ isActive }) => ({ color: isActive ? '#4b2e1f' : undefined })}
        >
          <Icon size={19} />
          <span className={collapsed ? 'lg:hidden' : ''}>{label}</span>
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      {mobileOpen && (
        <button
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Đóng menu quản trị"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={[mobileOpen ? 'translate-x-0' : '-translate-x-full', collapsed ? 'lg:w-20' : 'lg:w-64', 'fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-[#193b2d] p-3 text-white transition-all lg:translate-x-0'].join(' ')}>
        <div className="mb-5 flex items-center justify-between px-2 py-3">
          <span className={[collapsed ? 'lg:hidden' : '', 'text-xl font-black'].join(' ')}>LADYSTARS</span>
          <button className="hidden lg:block" onClick={() => setCollapsed(!collapsed)} aria-label="Thu gọn sidebar">
            <ChevronLeft className={collapsed ? 'rotate-180' : ''} />
          </button>
          <button className="lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Đóng menu">
            <X />
          </button>
        </div>
        {navigation}
      </aside>
      <div className={[collapsed ? 'lg:ml-20' : 'lg:ml-64', 'min-w-0 flex-1 transition-all'].join(' ')}>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-4 md:px-5">
          <div className="flex items-center gap-3">
            <button className="btn-secondary px-3 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Mở menu quản trị">
              <Menu size={19} />
            </button>
            <div>
              <div className="text-sm text-slate-500">Khu vực quản trị</div>
              <div className="font-bold">{user?.name}</div>
            </div>
          </div>
          <button className="btn-secondary" onClick={signOut}>
            <LogOut size={18} />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </header>
        <main className="p-4 md:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
