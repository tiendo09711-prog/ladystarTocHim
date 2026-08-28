import type { User } from '../../types'

export type PermissionRequirement = string | string[]

export function isBackofficeUser(user: User | null | undefined): boolean {
  return user?.status === 'active' && (user.role === 'staff' || user.role === 'admin')
}

export function isSuperAdmin(user: User | null | undefined): boolean {
  return user?.role === 'admin' || user?.is_super_admin === true
}

export function can(user: User | null | undefined, permission: string): boolean {
  if (isSuperAdmin(user)) return true
  return user?.role === 'staff' && (user.permissions ?? []).includes(permission)
}

export function canAny(user: User | null | undefined, permissions: string[]): boolean {
  return permissions.some((permission) => can(user, permission))
}

export function canAll(user: User | null | undefined, permissions: string[]): boolean {
  return permissions.every((permission) => can(user, permission))
}

export function hasRequirement(user: User | null | undefined, requirement?: PermissionRequirement, mode: 'any' | 'all' = 'all'): boolean {
  if (!requirement) return true
  const permissions = Array.isArray(requirement) ? requirement : [requirement]
  return mode === 'any' ? canAny(user, permissions) : canAll(user, permissions)
}
