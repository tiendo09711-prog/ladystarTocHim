import axios from 'axios'

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

export async function csrfCookie() {
  if (readXsrfToken()) return
  csrfRequest ??= axios.get(`${apiBaseUrl}/sanctum/csrf-cookie`, { withCredentials: true }).then(() => undefined).finally(() => { csrfRequest = null })
  await csrfRequest
}

apiClient.interceptors.request.use((config) => {
  const token = readXsrfToken()
  if (token) config.headers.set('X-XSRF-TOKEN', token)
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) window.dispatchEvent(new Event('auth:unauthorized'))
    return Promise.reject(error)
  },
)
