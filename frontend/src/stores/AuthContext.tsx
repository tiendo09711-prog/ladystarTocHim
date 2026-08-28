import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { apiClient, csrfCookie } from '../api/apiClient'
import type { ApiResponse, User } from '../types'
import { isBackofficeUser } from '../features/auth/permissions'

interface Credentials { email: string; password: string }
interface RegisterPayload extends Credentials { name: string; phone?: string; password_confirmation: string }
interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (payload: Credentials, admin?: boolean) => Promise<User>
  register: (payload: RegisterPayload) => Promise<User>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const authRevision = useRef(0)

  const refresh = useCallback(async () => {
    const revision = ++authRevision.current
    try {
      await csrfCookie()
      const response = await apiClient.get<ApiResponse<User>>('/auth/me')
      if (revision === authRevision.current) setUser(response.data.data)
    } catch {
      if (revision === authRevision.current) setUser(null)
    } finally {
      if (revision === authRevision.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const unauthorized = () => { authRevision.current += 1; setUser(null) }
    window.addEventListener('auth:unauthorized', unauthorized)
    return () => window.removeEventListener('auth:unauthorized', unauthorized)
  }, [refresh])

  const login = async (payload: Credentials, admin = false) => {
    await csrfCookie()
    const response = await apiClient.post<ApiResponse<User>>(admin ? '/admin/auth/login' : '/auth/login', payload)
    authRevision.current += 1
    setUser(response.data.data)
    setLoading(false)
    return response.data.data
  }

  const register = async (payload: RegisterPayload) => {
    await csrfCookie()
    const response = await apiClient.post<ApiResponse<User>>('/auth/register', payload)
    authRevision.current += 1
    setUser(response.data.data)
    setLoading(false)
    return response.data.data
  }

  const logout = async () => {
    await csrfCookie()
    await apiClient.post(isBackofficeUser(user) ? '/admin/auth/logout' : '/auth/logout')
    authRevision.current += 1
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth phải được dùng trong AuthProvider')
  return context
}
