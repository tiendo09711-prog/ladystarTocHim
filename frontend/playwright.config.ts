import { defineConfig, devices } from '@playwright/test'
import { randomBytes } from 'node:crypto'

process.env.E2E_ADMIN_PASSWORD ??= `${randomBytes(24).toString('base64url')}Aa1`

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  outputDir: '../artifacts/playwright',
  timeout: 30_000,
  expect: { timeout: 15_000 },
  use: { baseURL: 'http://127.0.0.1:5174', trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure' },
  webServer: [
    { command: 'node scripts/start-e2e-backend.mjs', cwd: '.', url: 'http://127.0.0.1:8011/up', reuseExistingServer: false, timeout: 120_000 },
    { command: 'node scripts/start-e2e-frontend.mjs', cwd: '.', url: 'http://127.0.0.1:5174', reuseExistingServer: false, timeout: 120_000 },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
