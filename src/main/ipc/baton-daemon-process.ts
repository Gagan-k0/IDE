import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { BATON_DAEMON_URL } from '../../shared/baton-types'
import { getSpawnArgsForWindows } from '../win32-utils'

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

export async function isDaemonReachable(): Promise<boolean> {
  try {
    const response = await fetch(BATON_DAEMON_URL, { signal: AbortSignal.timeout(2_000) })
    return response.ok || response.status === 401 || response.status === 403
  } catch {
    return false
  }
}

export async function probeDaemonMeta(): Promise<{ repo: string | null; pid: number | null }> {
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

export function samePath(a: string, b: string): boolean {
  const norm = (p: string) => (process.platform === 'win32' ? resolve(p).toLowerCase() : resolve(p))
  return norm(a) === norm(b)
}

export function killDaemonPid(pid: number): void {
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

export async function pidListeningOnPort(port: number): Promise<number | null> {
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

export async function waitForDaemonGone(timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!(await isDaemonReachable())) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
}

export async function waitForDaemonReady(): Promise<boolean> {
  const deadline = Date.now() + 20 * 1000
  while (Date.now() < deadline) {
    if (await isDaemonReachable()) {
      return true
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return false
}