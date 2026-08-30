import axios from 'axios'

declare module 'axios' {
  export interface AxiosRequestConfig {
    suppressUnauthorizedEvent?: boolean
  }

  export interface InternalAxiosRequestConfig {
    suppressUnauthorizedEvent?: boolean
  }
}

const defaultApiBaseUrl = typeof window === 'undefined'
  ? 'http://localhost:8000'
  : `${window.location.protocol}//${window.location.hostname}:8000`

export const apiBaseUrl = import.meta.env.VITE_API_URL ?? defaultApiBaseUrl

export const apiClient = axios.create({
  baseURL: `${apiBaseUrl}/api/v1`,
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: 'application/json' },
})

function readXsrfToken() {
  const token = document.cookie.split('; ').find((cookie) => cookie.startsWith('XSRF-TOKEN='))?.split('=')[1]
  return token ? decodeURIComponent(token) : null
}

let csrfRequest: Promise<void> | null = null

async function requestCsrfCookie() {
  csrfRequest ??= axios.get(`${apiBaseUrl}/sanctum/csrf-cookie`, { withCredentials: true }).then(() => undefined).finally(() => { csrfRequest = null })
  await csrfRequest
}

export async function csrfCookie() {
  if (readXsrfToken()) return
  await requestCsrfCookie()
}

apiClient.interceptors.request.use((config) => {
  const token = readXsrfToken()
  if (token) config.headers.set('X-XSRF-TOKEN', token)
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config as (typeof error.config & { _csrfRetried?: boolean }) | undefined
    if (error.response?.status === 419 && request && !request._csrfRetried) {
      request._csrfRetried = true
      await requestCsrfCookie()
      const token = readXsrfToken()
      if (token) request.headers.set('X-XSRF-TOKEN', token)
      return apiClient.request(request)
    }
    const isAuthProbe = request?.url?.endsWith('/auth/me') || request?.url?.endsWith('/admin/auth/me')
    if (error.response?.status === 401 && !isAuthProbe && !request?.suppressUnauthorizedEvent) window.dispatchEvent(new Event('auth:unauthorized'))
    return Promise.reject(error)
  },
)
