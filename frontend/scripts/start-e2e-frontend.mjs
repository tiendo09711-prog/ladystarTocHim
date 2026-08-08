import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

const vite = resolve(import.meta.dirname, '../node_modules/vite/bin/vite.js')
const server = spawn(process.execPath, [vite, '--host', '127.0.0.1', '--port', '5174', '--mode', 'e2e'], { env: { ...process.env, VITE_API_URL: 'http://127.0.0.1:5174' }, stdio: 'inherit' })
const stop = () => server.kill()
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
server.on('exit', (code) => process.exit(code ?? 0))
