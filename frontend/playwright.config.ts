import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  outputDir: '../artifacts/playwright',
  timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:5174', trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure' },
  webServer: [
    { command: 'node scripts/start-e2e-backend.mjs', cwd: '.', url: 'http://127.0.0.1:8011/up', reuseExistingServer: false, timeout: 120_000 },
    { command: 'node scripts/start-e2e-frontend.mjs', cwd: '.', url: 'http://127.0.0.1:5174', reuseExistingServer: false, timeout: 120_000 },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
