import { describe, expect, it } from 'vitest'
import { getAccessState } from './authState'
import type { User } from '../../types'

describe('auth state', () => {
  it('phân biệt loading, guest, customer và backoffice', () => {
    const user = { id: 1, name: 'User', email: 'u@test.local', role: 'user', status: 'active' } as User
    expect(getAccessState(null, true)).toBe('loading')
    expect(getAccessState(null, false)).toBe('guest')
    expect(getAccessState(user, false)).toBe('user')
    expect(getAccessState({ ...user, role: 'staff' }, false)).toBe('admin')
    expect(getAccessState({ ...user, role: 'admin' }, false)).toBe('admin')
  })
})
