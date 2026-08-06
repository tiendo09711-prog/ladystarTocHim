import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../stores/AuthContext'
import { getAccessState } from '../features/auth/authState'

export function UserProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const access = getAccessState(user, loading)
  if (access === 'loading') return <div className="p-10 text-center">Đang kiểm tra phiên đăng nhập...</div>
  return access === 'user' || access === 'admin' ? <Outlet /> : <Navigate to="/dang-nhap" state={{ from: location.pathname }} replace />
}
