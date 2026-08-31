import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import App from './App'
import { AuthProvider } from './stores/AuthContext'
import { CartProvider } from './stores/CartContext'
import { CurrencyProvider } from './stores/CurrencyContext'
import './index.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
        <AuthProvider>
          <CartProvider>
            <App />
            <Toaster position="top-right" richColors />
          </CartProvider>
        </AuthProvider>
      </CurrencyProvider>
    </QueryClientProvider>
  </StrictMode>,
)
