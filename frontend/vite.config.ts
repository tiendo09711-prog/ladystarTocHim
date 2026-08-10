import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    ...(mode === 'e2e' ? {
      proxy: {
        '/api': { target: 'http://127.0.0.1:8011', changeOrigin: false },
        '/sanctum': { target: 'http://127.0.0.1:8011', changeOrigin: false },
        '/storage': { target: 'http://127.0.0.1:8011', changeOrigin: false },
      },
    } : {}),
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
}))