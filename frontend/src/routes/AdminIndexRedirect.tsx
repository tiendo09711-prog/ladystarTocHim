import { Navigate } from 'react-router-dom'
import { getFirstAllowedAdminPath } from '../config/adminNavigation'
import { useAuth } from '../stores/AuthContext'

export function AdminIndexRedirect() {
  const { user } = useAuth()
  return <Navigate to={getFirstAllowedAdminPath(user) ?? '/admin/forbidden'} replace />
}
