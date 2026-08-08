import { BarChart3, Boxes, ChevronLeft, ClipboardList, FileSpreadsheet, History, PanelsTopLeft, LayoutDashboard, LogOut, Menu, Newspaper, Package, Settings, ShoppingBag, Tags, TicketPercent, Users, Warehouse, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../stores/AuthContext'

const menu = [
  ['Dashboard', '/admin/dashboard', LayoutDashboard], ['Sáº£n pháº©m', '/admin/products', Package], ['Danh má»¥c', '/admin/categories', Tags],
  ['Thuá»™c tÃ­nh', '/admin/attributes', Boxes], ['Chi nhÃ¡nh', '/admin/branches', Warehouse], ['Tá»“n kho', '/admin/inventory', ClipboardList],
  ['Lá»‹ch sá»­ kho', '/admin/inventory/transactions', History], ['ÄÆ¡n hÃ ng', '/admin/orders', ShoppingBag], ['KhÃ¡ch hÃ ng', '/admin/customers', Users],
  ['ÄÃ¡nh giÃ¡', '/admin/reviews', BarChart3], ['MÃ£ giáº£m giÃ¡', '/admin/coupons', TicketPercent], ['Import / Export', '/admin/import-export', FileSpreadsheet],
  ['Barcode', '/admin/barcodes', Boxes], ['BÃ¡o cÃ¡o', '/admin/reports', BarChart3],
  ['Ná»™i dung About', '/admin/about', PanelsTopLeft], ['Nội dung sản phẩm', '/admin/catalog-content', PanelsTopLeft], ['Yêu cầu tư vấn', '/admin/consultation-requests', ClipboardList], ['Báº£n tin', '/admin/news', Newspaper], ['CÃ i Ä‘áº·t', '/admin/settings', Settings],
] as const

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false); const [mobileOpen, setMobileOpen] = useState(false); const { user, logout } = useAuth(); const navigate = useNavigate()
  const signOut = async () => { await logout(); navigate('/admin/login') }
  const navigation = <nav className="grid gap-1">{menu.map(([label, to, Icon]) => <NavLink key={to} to={to} title={label} onClick={() => setMobileOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${isActive ? 'bg-white text-[#193b2d]' : 'text-emerald-50 hover:bg-white/10'}`}><Icon size={19} /><span className={collapsed ? 'lg:hidden' : ''}>{label}</span></NavLink>)}</nav>
  return <div className="min-h-screen bg-slate-100 lg:flex">{mobileOpen && <button className="fixed inset-0 z-40 bg-black/40 lg:hidden" aria-label="ÄÃ³ng menu quáº£n trá»‹" onClick={() => setMobileOpen(false)} />}<aside className={`${mobileOpen ? 'translate-x-0' : '-translate-x-full'} ${collapsed ? 'lg:w-20' : 'lg:w-64'} fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-[#193b2d] p-3 text-white transition-all lg:translate-x-0`}><div className="mb-5 flex items-center justify-between px-2 py-3"><span className={`${collapsed ? 'lg:hidden' : ''} text-xl font-black`}>NAM HAIR</span><button className="hidden lg:block" onClick={() => setCollapsed(!collapsed)} aria-label="Thu gá»n sidebar"><ChevronLeft className={collapsed ? 'rotate-180' : ''} /></button><button className="lg:hidden" onClick={() => setMobileOpen(false)} aria-label="ÄÃ³ng menu"><X /></button></div>{navigation}</aside><div className={`${collapsed ? 'lg:ml-20' : 'lg:ml-64'} min-w-0 flex-1 transition-all`}><header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-4 md:px-5"><div className="flex items-center gap-3"><button className="btn-secondary px-3 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Má»Ÿ menu quáº£n trá»‹"><Menu size={19} /></button><div><div className="text-sm text-slate-500">Khu vá»±c quáº£n trá»‹</div><div className="font-bold">{user?.name}</div></div></div><button className="btn-secondary" onClick={signOut}><LogOut size={18} /><span className="hidden sm:inline">ÄÄƒng xuáº¥t</span></button></header><main className="p-4 md:p-7"><Outlet /></main></div></div>
}
