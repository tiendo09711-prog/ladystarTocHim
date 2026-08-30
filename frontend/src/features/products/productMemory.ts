import { readStorage, writeStorage } from '../../utils/safeStorage'

const RECENT_KEY = 'ladystars_recently_viewed_v1'
const COMPARE_KEY = 'ladystars_compare_v1'
const SEARCH_KEY = 'ladystars_search_history_v1'

type RecentEntry = { productId: number; viewedAt: string; variantId?: number | null }

export function rememberProduct(productId: number, variantId?: number | null) {
  const entries = readStorage<RecentEntry[]>(RECENT_KEY, []).filter((entry) => entry.productId !== productId)
  writeStorage(RECENT_KEY, [{ productId, viewedAt: new Date().toISOString(), variantId }, ...entries].slice(0, 10))
  window.dispatchEvent(new Event('ladystars:recently-viewed'))
}

export function recentlyViewedIds(excludeId?: number) {
  return readStorage<RecentEntry[]>(RECENT_KEY, []).map((entry) => entry.productId).filter((id) => id !== excludeId).slice(0, 10)
}

export function compareIds() {
  return readStorage<number[]>(COMPARE_KEY, []).filter((id) => Number.isInteger(id) && id > 0).slice(0, 4)
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
  const values = readStorage<string[]>(SEARCH_KEY, []).filter((item) => item.toLocaleLowerCase('vi') !== normalized.toLocaleLowerCase('vi'))
  writeStorage(SEARCH_KEY, [normalized, ...values].slice(0, 5))
}

export function searchHistory() {
  return readStorage<string[]>(SEARCH_KEY, []).slice(0, 5)
}
