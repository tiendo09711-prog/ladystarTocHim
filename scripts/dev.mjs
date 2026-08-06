import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const backend = path.join(root, 'backend')
const frontend = path.join(root, 'frontend')
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const children = []

const log = (message) => console.log(`[dev] ${message}`)
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

function commandExists(command) {
  return spawnSync(process.platform === 'win32' ? 'where' : 'which', [command], { stdio: 'ignore' }).status === 0
}

function run(command, argumentsList, cwd = root) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, argumentsList, { cwd, stdio: 'inherit', shell: process.platform === 'win32' && command === npm })
    child.once('error', reject)
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with code ${code ?? 'unknown'}.`)))
  })
}

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port })
    const done = (open) => {
      socket.removeAllListeners()
      socket.destroy()
      resolve(open)
    }
    socket.setTimeout(500)
    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))
  })
}

async function waitForPort(port, name) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await portOpen(port)) return
    await sleep(500)
  }
  throw new Error(`${name} did not become available on port ${port}.`)
}

function laragonMySql() {
  const mysqlRoot = path.join(process.env.LARAGON_ROOT || 'C:\\laragon', 'bin', 'mysql')
  if (!existsSync(mysqlRoot)) return null
  const versions = readdirSync(mysqlRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort().reverse()
  for (const version of versions) {
    const directory = path.join(mysqlRoot, version)
    const executable = path.join(directory, 'bin', 'mysqld.exe')
    const config = path.join(directory, 'my.ini')
    if (existsSync(executable) && existsSync(config)) return { executable, config }
  }
  return null
}

async function ensureMySql() {
  if (await portOpen(3306)) {
    log('MySQL is already available on port 3306.')
    return
  }

  const laragon = laragonMySql()
  if (laragon) {
    log('Starting MySQL from Laragon...')
    const child = spawn(laragon.executable, [`--defaults-file=${laragon.config}`], { detached: true, stdio: 'ignore', windowsHide: true })
    child.unref()
  } else if (commandExists('docker')) {
    log('Starting MySQL with Docker Compose...')
    await run('docker', ['compose', 'up', '-d', 'mysql'])
  } else {
    throw new Error('MySQL is stopped and neither Laragon nor Docker Compose is available.')
  }

  await waitForPort(3306, 'MySQL')
}

function start(command, argumentsList, cwd) {
  const child = spawn(command, argumentsList, { cwd, stdio: 'inherit', shell: process.platform === 'win32' && command === npm })
  children.push(child)
  return child
}

function stopChildren() {
  for (const child of children) {
    if (!child.pid || child.exitCode !== null) continue
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' })
    else child.kill('SIGTERM')
  }
}

async function main() {
  if (!existsSync(path.join(backend, 'vendor', 'autoload.php'))) throw new Error('Missing backend/vendor. Run `cd backend; composer install` once.')
  if (!existsSync(path.join(frontend, 'node_modules'))) throw new Error('Missing frontend/node_modules. Run `cd frontend; npm ci` once.')
  if (!existsSync(path.join(backend, '.env'))) throw new Error('Missing backend/.env. Copy backend/.env.example, then set APP_KEY and database credentials.')

  await ensureMySql()
  await run('php', ['artisan', 'migrate', '--no-interaction'], backend)

  const running = []
  if (await portOpen(8000)) log('Backend is already available on http://127.0.0.1:8000.')
  else running.push(start('php', ['artisan', 'serve', '--host=127.0.0.1', '--port=8000'], backend))

  if (await portOpen(5173)) log('Frontend is already available on http://127.0.0.1:5173.')
  else running.push(start(npm, ['run', 'dev', '--', '--host', '127.0.0.1'], frontend))

  log('Ready: frontend http://127.0.0.1:5173 | backend http://127.0.0.1:8000')
  log('Press Ctrl+C to stop frontend and backend. MySQL keeps running.')
  await new Promise((resolve) => {
    process.once('SIGINT', resolve)
    process.once('SIGTERM', resolve)
    for (const child of running) child.once('exit', resolve)
  })
}

main().catch((error) => {
  console.error(`[dev] ${error.message}`)
  process.exitCode = 1
}).finally(stopChildren)
