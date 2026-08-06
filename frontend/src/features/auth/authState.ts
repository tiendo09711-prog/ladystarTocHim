import type { User } from '../../types'

export type AccessState = 'loading' | 'guest' | 'user' | 'admin'

export function getAccessState(user: User | null, loading: boolean): AccessState {
  if (loading) return 'loading'
  if (!user) return 'guest'
  return user.role === 'admin' ? 'admin' : 'user'
}
