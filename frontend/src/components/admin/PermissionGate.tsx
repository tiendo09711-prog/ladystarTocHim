import type { ReactNode } from 'react'
import { hasRequirement, type PermissionRequirement } from '../../features/auth/permissions'
import { useAuth } from '../../stores/AuthContext'

export function PermissionGate({ permission, mode = 'all', children, fallback = null }: { permission: PermissionRequirement; mode?: 'any' | 'all'; children: ReactNode; fallback?: ReactNode }) {
  const { user } = useAuth()
  return hasRequirement(user, permission, mode) ? children : fallback
}
