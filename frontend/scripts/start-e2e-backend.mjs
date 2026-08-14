import { closeSync, existsSync, openSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'

const backend = resolve(import.meta.dirname, '../../backend')
const database = resolve(backend, 'database/e2e_test.sqlite')
const hasDatabase = existsSync(database) && statSync(database).size > 0
if (!existsSync(database)) closeSync(openSync(database, 'a'))

const environment = { ...process.env, APP_ENV: 'testing', APP_URL: 'http://127.0.0.1:8011', DB_CONNECTION: 'sqlite', DB_DATABASE: database, FRONTEND_URL: 'http://127.0.0.1:5174', FRONTEND_URLS: 'http://127.0.0.1:5174', SANCTUM_STATEFUL_DOMAINS: '127.0.0.1:5174', SESSION_DRIVER: 'file', CACHE_STORE: 'array', QUEUE_CONNECTION: 'sync' }
for (const args of [['artisan', 'migrate', '--force'], ...(!hasDatabase ? [['artisan', 'db:seed', '--force']] : [])]) {
  const result = spawnSync('php', args, { cwd: backend, env: environment, stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
const serviceSeed = spawnSync('php', ['artisan', 'db:seed', '--class=ServiceSeeder', '--force'], { cwd: backend, env: environment, stdio: 'inherit' })
if (serviceSeed.status !== 0) process.exit(serviceSeed.status ?? 1)

const server = spawn('php', ['artisan', 'serve', '--host=127.0.0.1', '--port=8011'], { cwd: backend, env: environment, stdio: 'inherit' })
const stop = () => server.kill()
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
server.on('exit', (code) => process.exit(code ?? 0))
