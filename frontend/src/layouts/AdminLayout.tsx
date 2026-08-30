import {
  ChevronDown,
  ChevronLeft,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getActiveAdminNavigation, getVisibleAdminNavigation, type AdminNavigationItem } from '../config/adminNavigation'
import { PermissionProtectedRoute } from '../routes/PermissionProtectedRoute'
import { useAuth } from '../stores/AuthContext'
import { AdminGlobalSearch } from '../components/admin/AdminGlobalSearch'
import { can } from '../features/auth/permissions'
import { useAdminAttention } from '../features/admin/useAdminAttention'

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const activeNavigation = getActiveAdminNavigation(location.pathname)
  const activeGroupId = activeNavigation?.groupId
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set(activeGroupId ? [activeGroupId] : []))
  const { user, logout } = useAuth()
  const visibleNavigation = useMemo(() => getVisibleAdminNavigation(user), [user])
  const navigate = useNavigate()
  const attention = useAdminAttention(can(user, 'dashboard.view'))

  useEffect(() => {
    if (!activeGroupId) return
    setExpandedGroups((current) => current.has(activeGroupId) ? current : new Set([...current, activeGroupId]))
  }, [activeGroupId])

  const signOut = async () => {
    await logout()
    navigate('/admin/login')
  }

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  const navigationLink = (item: AdminNavigationItem, nested = false) => {
    const Icon = item.icon
    const isActive = activeNavigation?.item.id === item.id

    return (
      <Link
        key={item.path}
        to={item.path}
        title={item.label}
        aria-label={item.label}
        aria-current={isActive ? 'page' : undefined}
        onClick={() => setMobileOpen(false)}
        className={[
          'flex items-center gap-3 rounded-xl py-2.5 text-sm font-semibold transition-colors',
          nested ? 'pl-4 pr-3' : 'px-3',
          nested && collapsed ? 'lg:px-3' : '',
          isActive ? 'bg-white shadow-sm' : 'text-emerald-50 hover:bg-white/10',
        ].join(' ')}
        style={{ color: isActive ? '#4b2e1f' : undefined }}
      >
        <Icon className="shrink-0" size={19} />
        <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      {mobileOpen && (
        <button
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Đóng menu quản trị"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={[mobileOpen ? 'translate-x-0' : '-translate-x-full', collapsed ? 'lg:w-20' : 'lg:w-72', 'admin-sidebar fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-hidden bg-[#193b2d] p-3 text-white transition-all lg:translate-x-0'].join(' ')}>
        <div className="mb-5 flex items-center justify-between px-2 py-3">
          <span className={[collapsed ? 'lg:hidden' : '', 'text-xl font-black'].join(' ')}>LADYSTARS</span>
          <button className="hidden lg:block" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}>
            <ChevronLeft className={collapsed ? 'rotate-180' : ''} />
          </button>
          <button className="lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Đóng menu">
            <X />
          </button>
        </div>
        <nav className="grid min-h-0 flex-1 content-start gap-1 overflow-x-hidden overflow-y-auto overscroll-contain pr-1" aria-label="Điều hướng quản trị">
          {visibleNavigation.dashboard && navigationLink(visibleNavigation.dashboard)}
          {visibleNavigation.groups.map((group) => {
            const GroupIcon = group.icon
            const expanded = expandedGroups.has(group.id)
            const containsActiveItem = activeGroupId === group.id
            const contentId = `admin-nav-group-${group.id}`

            return (
              <div className={group.separated ? 'mt-3 border-t border-white/15 pt-3' : 'mt-2'} key={group.id}>
                <button
                  type="button"
                  className={[
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition-colors hover:bg-white/10',
                    containsActiveItem ? 'bg-white/10 text-white' : 'text-emerald-100',
                  ].join(' ')}
                  title={group.label}
                  aria-label={group.label}
                  aria-expanded={expanded}
                  aria-controls={contentId}
                  onClick={() => toggleGroup(group.id)}
                >
                  <GroupIcon className="shrink-0" size={18} />
                  <span className={[collapsed ? 'lg:hidden' : '', 'min-w-0 flex-1 truncate'].join(' ')}>{group.label}</span>
                  <ChevronDown className={[collapsed ? 'lg:hidden' : '', expanded ? 'rotate-180' : '', 'shrink-0 transition-transform'].join(' ')} size={17} aria-hidden="true" />
                </button>
                <div className={['mt-1 ml-4 grid gap-1 border-l border-white/15 pl-2', collapsed ? 'lg:ml-0 lg:border-l-0 lg:pl-0' : ''].join(' ')} id={contentId} hidden={!expanded}>
                  {group.items.map((item) => navigationLink(item, true))}
                </div>
              </div>
            )
          })}
        </nav>
        {!collapsed && attention.data && <div className='mt-3 hidden rounded-xl bg-white/10 p-3 text-xs lg:block'><strong>Cần xử lý</strong><div className='mt-2 grid gap-1'><span>Đơn chờ: {attention.data.counters.pending_orders ?? 0}</span><span>Đổi trả: {attention.data.counters.returns_requested ?? 0}</span><span>Bảo hành: {attention.data.counters.warranties_requested ?? 0}</span></div></div>}
      </aside>
      <div className={[collapsed ? 'lg:ml-20' : 'lg:ml-72', 'min-w-0 flex-1 transition-all'].join(' ')}>
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
          {can(user, 'dashboard.view') && <AdminGlobalSearch />}
          <button className="btn-secondary" onClick={signOut}>
            <LogOut size={18} />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </header>
        <main className="p-4 md:p-7">
          <PermissionProtectedRoute><Outlet /></PermissionProtectedRoute>
        </main>
      </div>
    </div>
  )
}
