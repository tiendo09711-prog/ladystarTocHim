import { apiBaseUrl } from '../api/apiClient'

export function resolveAssetUrl(path?: string | null, fallback = '/images/product-placeholder.svg') {
  if (!path) return fallback
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  if (path.startsWith('/storage/')) return `${apiBaseUrl}${path}`
  if (path.startsWith('/')) return path
  return `${apiBaseUrl}/storage/${path}`
}
