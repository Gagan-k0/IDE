import { spawn, type ChildProcess } from 'node:child_process'
import { readFileSync, realpathSync, statSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import type { BatonDaemonStatus } from '../../shared/baton-types'
import { BATON_DAEMON_PORT, BATON_DAEMON_URL } from '../../shared/baton-types'
import { resolveCliCommand } from '../../shared/node-cli-command-resolution'
import { getSpawnArgsForWindows } from '../win32-utils'

const DAEMON_READY_POLL_INTERVAL_MS = 500
const DAEMON_READY_TIMEOUT_MS = 20 * 1000

let trackedDaemonChild: ChildProcess | null = null
let currentDaemonPid: number | null = null

export function isExistingDirectory(folderPath: string): boolean {
  try {
    return isAbsolute(folderPath) && statSync(folderPath).isDirectory()
  } catch {
    return false
  }
}

export async function captureCommandOutput(
  command: string,
  args: string[],
  options: { cwd: string; timeoutMs?: number }
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  const { spawnCmd, spawnArgs } = getSpawnArgsForWindows(command, args)
  return new Promise((resolve) => {
    const child = spawn(spawnCmd, spawnArgs, {
      cwd: options.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    })
    let stdout = ''
    let stderr = ''
    let settled = false
    const timer =
      options.timeoutMs && options.timeoutMs > 0
        ? setTimeout(() => {
            if (settled) {
              return
            }
            settled = true
            child.kill()
            resolve({ stdout, stderr: `${stderr}\nTimed out after ${options.timeoutMs}ms.`, code: null })
          }, options.timeoutMs)
        : null
    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf-8')
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf-8')
    })
    child.once('error', () => {
      if (settled) {
        return
      }
      settled = true
      if (timer) {
        clearTimeout(timer)
      }
      resolve({ stdout, stderr, code: null })
    })
    child.once('close', (code) => {
      if (settled) {
        return
      }
      settled = true
      if (timer) {
        clearTimeout(timer)
      }
      resolve({ stdout, stderr, code })
    })
  })
}

async function isDaemonReachable(): Promise<boolean> {
  try {
    const response = await fetch(BATON_DAEMON_URL, { signal: AbortSignal.timeout(2_000) })
    return response.ok || response.status === 401 || response.status === 403
  } catch {
    return false
  }
}

async function probeDaemonMeta(): Promise<{ repo: string | null; pid: number | null }> {
  try {
    const response = await fetch(`${BATON_DAEMON_URL}/api/meta`, { signal: AbortSignal.timeout(2_000) })
    if (!response.ok) {
      return { repo: null, pid: null }
    }
    const body = (await response.json()) as { repo?: unknown; pid?: unknown }
    return {
      repo: typeof body.repo === 'string' ? body.repo : null,
      pid: typeof body.pid === 'number' ? body.pid : null
    }
  } catch {
    return { repo: null, pid: null }
  }
}

function samePath(a: string, b: string): boolean {
  const norm = (p: string) => (process.platform === 'win32' ? resolve(p).toLowerCase() : resolve(p))
  return norm(a) === norm(b)
}

function hubClaimsProject(hub: string, child: string): boolean {
  try {
    const kb = JSON.parse(readFileSync(join(hub, '.baton', 'kb.json'), 'utf-8')) as {
      projects?: { path?: string }[]
    }
    if (!kb.projects?.length) {
      return false
    }
    const realChild = realpathSync(child)
    return kb.projects.some((p) => p.path && realpathSync(p.path) === realChild)
  } catch {
    return false
  }
}

async function resolveBatonRootFor(folderPath: string): Promise<string | null> {
  let dir = folderPath
  let nearest: string | null = null
  for (;;) {
    try {
      if (statSync(join(dir, '.baton')).isDirectory()) {
        if (nearest === null) {
          nearest = dir
        } else if (hubClaimsProject(dir, nearest)) {
          return dir
        }
      }
    } catch {
      // no .baton here
    }
    const parent = dirname(dir)
    if (parent === dir) {
      break
    }
    dir = parent
  }
  if (nearest) {
    return nearest
  }
  const result = await captureCommandOutput('git', ['rev-parse', '--show-toplevel'], {
    cwd: folderPath,
    timeoutMs: 5_000
  })
  const root = result.stdout.trim()
  return result.code === 0 && root ? root : null
}

function killDaemonPid(pid: number): void {
  if (process.platform === 'win32') {
    try {
      spawn('taskkill', ['/pid', String(pid), '/t', '/f'], {
        stdio: 'ignore',
        windowsHide: true
      })
      return
    } catch {
      // fall through to the signal path
    }
  }
  try {
    process.kill(pid, 'SIGTERM')
  } catch {
    // already gone
  }
}

async function pidListeningOnPort(port: number): Promise<number | null> {
  if (process.platform === 'win32') {
    const result = await captureCommandOutput('netstat', ['-ano'], {
      cwd: process.cwd(),
      timeoutMs: 5_000
    })
    const wanted = `:${port}`
    for (const line of result.stdout.split(/\r?\n/)) {
      if (line.includes(wanted) && line.includes('LISTENING')) {
        const pid = line.trim().split(/\s+/).at(-1)
        if (pid && /^\d+$/.test(pid)) {
          return Number(pid)
        }
      }
    }
    return null
  }
  const result = await captureCommandOutput('lsof', ['-t', `-i:${port}`, '-sTCP:LISTEN'], {
    cwd: process.cwd(),
    timeoutMs: 5_000
  })
  const pid = result.stdout.trim()
  return /^\d+$/.test(pid) ? Number(pid) : null
}

async function waitForDaemonGone(timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!(await isDaemonReachable())) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
}

async function waitForDaemonReady(): Promise<boolean> {
  const deadline = Date.now() + DAEMON_READY_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (await isDaemonReachable()) {
      return true
    }
    await new Promise((resolve) => setTimeout(resolve, DAEMON_READY_POLL_INTERVAL_MS))
  }
  return false
}

export async function getBatonDaemonStatus(): Promise<BatonDaemonStatus> {
  const running = await isDaemonReachable()
  const meta = running ? await probeDaemonMeta() : null
  return {
    running,
    url: BATON_DAEMON_URL,
    pid: meta?.pid ?? currentDaemonPid,
    root: meta?.repo ?? null
  }
}

function killTrackedDaemon(): void {
  const child = trackedDaemonChild
  trackedDaemonChild = null
  currentDaemonPid = null
  if (!child?.pid) {
    return
  }
  if (process.platform === 'win32') {
    try {
      spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore',
        windowsHide: true
      })
      return
    } catch {
      child.kill()
      return
    }
  }
  child.kill()
}

export async function startBatonDaemon(folderPath: string): Promise<BatonDaemonStatus> {
  if (!isExistingDirectory(folderPath)) {
    throw new Error('The selected folder no longer exists.')
  }
  const root = await resolveBatonRootFor(folderPath)
  if (!root) {
    throw new Error('Baton is not set up for this folder — run setup first.')
  }
  const meta = await probeDaemonMeta()
  if (meta.repo && samePath(meta.repo, root)) {
    trackedDaemonChild = null
    currentDaemonPid = meta.pid
    return getBatonDaemonStatus()
  }
  const foreignPid = meta.pid ?? (await pidListeningOnPort(BATON_DAEMON_PORT))
  if (foreignPid) {
    killDaemonPid(foreignPid)
    await waitForDaemonGone()
  }
  if (await isDaemonReachable()) {
    return { running: false, url: BATON_DAEMON_URL, pid: null, root: null }
  }
  killTrackedDaemon()
  const command = resolveCliCommand('baton')
  const { spawnCmd, spawnArgs } = getSpawnArgsForWindows(command, [
    'serve',
    '--write',
    '-p',
    String(BATON_DAEMON_PORT)
  ])
  const child = spawn(spawnCmd, spawnArgs, {
    cwd: root,
    stdio: 'ignore',
    detached: true,
    windowsHide: true
  })
  const childPid = child.pid ?? null
  trackedDaemonChild = child
  currentDaemonPid = childPid
  child.unref()
  child.once('exit', () => {
    if (trackedDaemonChild === child) {
      trackedDaemonChild = null
    }
    if (currentDaemonPid === childPid) {
      currentDaemonPid = null
    }
  })

  const ready = await waitForDaemonReady()
  if (!ready) {
    killTrackedDaemon()
    return { running: false, url: BATON_DAEMON_URL, pid: null, root: null }
  }
  const after = await probeDaemonMeta()
  if (after.repo && !samePath(after.repo, root)) {
    killTrackedDaemon()
    return { running: false, url: BATON_DAEMON_URL, pid: null, root: null }
  }
  return getBatonDaemonStatus()
}

export async function stopBatonDaemon(): Promise<BatonDaemonStatus> {
  killTrackedDaemon()
  const meta = await probeDaemonMeta()
  const pid = meta.pid ?? (await pidListeningOnPort(BATON_DAEMON_PORT))
  if (pid) {
    killDaemonPid(pid)
    await waitForDaemonGone()
  }
  return getBatonDaemonStatus()
}