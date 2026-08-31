import { useQuery } from '@tanstack/react-query'
import { createContext, useContext, type ReactNode } from 'react'
import { getPublicSettings } from '../api/storeApi'
import type { PublicStoreSettings } from '../api/storeApi'

type PublicSettingsState = { data?: PublicStoreSettings; isLoading: boolean }

const PublicSettingsContext = createContext<PublicSettingsState>({ isLoading: true })

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const query = useQuery({ queryKey: ['public-settings'], queryFn: getPublicSettings })

  return <PublicSettingsContext.Provider value={{ data: query.data, isLoading: query.isLoading }}>{children}</PublicSettingsContext.Provider>
}

export function usePublicSettings() {
  return useContext(PublicSettingsContext)
}

export function useCurrency() {
  const settings = usePublicSettings().data
  return settings?.configured ? (settings.currency ?? '').trim().toUpperCase() : ''
}
