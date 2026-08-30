import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getActiveAdminNavigation } from '../config/adminNavigation'
import { hasRequirement, isBackofficeUser, isSuperAdmin } from '../features/auth/permissions'
import { AdminForbiddenPage } from '../pages/admin/AdminForbiddenPage'
import { useAuth } from '../stores/AuthContext'

const writeRoutePermissions = [
  { pattern: /^\/admin\/products\/(?:create|[^/]+\/edit)\/?$/, permission: 'products.manage' },
  { pattern: /^\/admin\/promotions\/(?:create|[^/]+\/edit|settings)\/?$/, permission: 'promotions.manage' },
]

export function PermissionProtectedRoute({ children }: { children?: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="p-10 text-center">Đang kiểm tra quyền truy cập...</div>
  if (!isBackofficeUser(user)) return <Navigate to="/admin/login" replace />

  const item = getActiveAdminNavigation(location.pathname)?.item
  const writePermission = writeRoutePermissions.find(({ pattern }) => pattern.test(location.pathname))?.permission
  const allowed = writePermission
    ? hasRequirement(user, writePermission)
    : !item || (item.superAdminOnly ? isSuperAdmin(user) : hasRequirement(user, item.permission, item.permissionMode))
  if (!allowed) return <AdminForbiddenPage />

  return children ?? <Outlet />
}
