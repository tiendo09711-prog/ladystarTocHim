import { readStorage, writeStorage } from '../../utils/safeStorage'

const RECENT_KEY = 'ladystars_recently_viewed_v1'
const COMPARE_KEY = 'ladystars_compare_v1'
const SEARCH_KEY = 'ladystars_search_history_v1'

type RecentEntry = { productId: number; viewedAt: string; variantId?: number | null }
const isRecentEntries = (value: unknown): value is RecentEntry[] => Array.isArray(value) && value.every((entry) => typeof entry === 'object' && entry !== null && Number.isInteger((entry as RecentEntry).productId) && typeof (entry as RecentEntry).viewedAt === 'string')
const isPositiveIntegers = (value: unknown): value is number[] => Array.isArray(value) && value.every((item) => Number.isInteger(item) && item > 0)
const isStrings = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string')

export function rememberProduct(productId: number, variantId?: number | null) {
  const entries = readStorage(RECENT_KEY, [], isRecentEntries).filter((entry) => entry.productId !== productId)
  writeStorage(RECENT_KEY, [{ productId, viewedAt: new Date().toISOString(), variantId }, ...entries].slice(0, 10))
  window.dispatchEvent(new Event('ladystars:recently-viewed'))
}

export function recentlyViewedIds(excludeId?: number) {
  return readStorage(RECENT_KEY, [], isRecentEntries).map((entry) => entry.productId).filter((id) => id !== excludeId).slice(0, 10)
}

export function compareIds() {
  return readStorage(COMPARE_KEY, [], isPositiveIntegers).slice(0, 4)
}

export function addCompareProduct(productId: number): 'added' | 'exists' | 'limit' {
  const ids = compareIds()
  if (ids.includes(productId)) return 'exists'
  if (ids.length >= 4) return 'limit'
  writeStorage(COMPARE_KEY, [...ids, productId])
  window.dispatchEvent(new Event('ladystars:compare'))
  return 'added'
}

export function removeCompareProduct(productId: number) {
  writeStorage(COMPARE_KEY, compareIds().filter((id) => id !== productId))
  window.dispatchEvent(new Event('ladystars:compare'))
}

export function rememberSearch(term: string) {
  const normalized = term.trim()
  if (!normalized) return
  const values = readStorage(SEARCH_KEY, [], isStrings).filter((item) => item.toLocaleLowerCase('vi') !== normalized.toLocaleLowerCase('vi'))
  writeStorage(SEARCH_KEY, [normalized, ...values].slice(0, 5))
}

export function searchHistory() {
  return readStorage(SEARCH_KEY, [], isStrings).slice(0, 5)
}
