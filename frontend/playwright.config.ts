import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  outputDir: '../artifacts/playwright',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure' },
  webServer: [
    { command: 'php artisan serve --host=127.0.0.1 --port=8000', cwd: '../backend', url: 'http://localhost:8000/up', reuseExistingServer: true, timeout: 120_000 },
    { command: 'npm run dev -- --host 127.0.0.1', cwd: '.', url: 'http://localhost:5173', reuseExistingServer: true, timeout: 120_000 },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
