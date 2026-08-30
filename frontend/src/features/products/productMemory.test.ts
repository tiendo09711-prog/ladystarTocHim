import { beforeEach, describe, expect, it } from 'vitest'
import { addCompareProduct, compareIds, recentlyViewedIds, rememberProduct, rememberSearch, searchHistory } from './productMemory'

describe('product memory', () => {
  beforeEach(() => sessionStorage.clear())

  it('deduplicates and caps recently viewed products', () => {
    for (let id = 1; id <= 12; id += 1) rememberProduct(id)
    rememberProduct(5)
    expect(recentlyViewedIds()).toHaveLength(10)
    expect(recentlyViewedIds()[0]).toBe(5)
  })

  it('limits compare list to four products', () => {
    expect(addCompareProduct(1)).toBe('added')
    expect(addCompareProduct(1)).toBe('exists')
    addCompareProduct(2); addCompareProduct(3); addCompareProduct(4)
    expect(addCompareProduct(5)).toBe('limit')
    expect(compareIds()).toEqual([1, 2, 3, 4])
  })

  it('keeps five unique search terms', () => {
    for (const term of ['lace', 'remy', 'mono', 'pu', 'natural', 'lace']) rememberSearch(term)
    expect(searchHistory()).toEqual(['lace', 'natural', 'pu', 'mono', 'remy'])
  })

  it('survives corrupt storage data', () => {
    for (const value of ['{bad json', 'null', '{}', 'abc', '123', '[null]', '[{}]']) {
      sessionStorage.setItem('ladystars_compare_v1', value)
      sessionStorage.setItem('ladystars_recently_viewed_v1', value)
      sessionStorage.setItem('ladystars_search_history_v1', value)
      expect(compareIds()).toEqual([])
      expect(recentlyViewedIds()).toEqual([])
      expect(searchHistory()).toEqual([])
    }
  })
})
