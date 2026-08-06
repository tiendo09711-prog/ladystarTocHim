import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../stores/AuthContext'
import { getAccessState } from '../features/auth/authState'

export function AdminProtectedRoute() {
  const { user, loading } = useAuth()
  const access = getAccessState(user, loading)
  if (access === 'loading') return <div className="p-10 text-center">Đang kiểm tra quyền quản trị...</div>
  return access === 'admin' ? <Outlet /> : <Navigate to="/admin/login" replace />
}
