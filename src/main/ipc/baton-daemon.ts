import { spawn, type ChildProcess } from 'node:child_process'
import { readFileSync, realpathSync, statSync } from 'node:fs'
import { dirname, isAbsolute, join } from 'node:path'
import type { BatonDaemonStatus } from '../../shared/baton-types'
import { BATON_DAEMON_PORT, BATON_DAEMON_URL } from '../../shared/baton-types'
import { resolveCliCommand } from '../../shared/node-cli-command-resolution'
import { getSpawnArgsForWindows } from '../win32-utils'
import {
  captureCommandOutput,
  isDaemonReachable,
  killDaemonPid,
  pidListeningOnPort,
  probeDaemonMeta,
  samePath,
  waitForDaemonGone,
  waitForDaemonReady
} from './baton-daemon-process'
import { clearSkillsSummary, getSkillsSummary, installAllBatonSkills } from './baton-skill-install'

let trackedDaemonChild: ChildProcess | null = null
let currentDaemonPid: number | null = null

export function isExistingDirectory(folderPath: string): boolean {
  try {
    return isAbsolute(folderPath) && statSync(folderPath).isDirectory()
  } catch {
    return false
  }
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

export async function getBatonDaemonStatus(): Promise<BatonDaemonStatus> {
  const running = await isDaemonReachable()
  const meta = running ? await probeDaemonMeta() : null
  return {
    running,
    url: BATON_DAEMON_URL,
    pid: meta?.pid ?? currentDaemonPid,
    root: meta?.repo ?? null,
    skills: running ? getSkillsSummary() : null
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
    await installAllBatonSkills()
    return getBatonDaemonStatus()
  }
  const foreignPid = meta.pid ?? (await pidListeningOnPort(BATON_DAEMON_PORT))
  if (foreignPid) {
    killDaemonPid(foreignPid)
    await waitForDaemonGone()
  }
  if (await isDaemonReachable()) {
    return { running: false, url: BATON_DAEMON_URL, pid: null, root: null, skills: null }
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
    return { running: false, url: BATON_DAEMON_URL, pid: null, root: null, skills: null }
  }
  const after = await probeDaemonMeta()
  if (after.repo && !samePath(after.repo, root)) {
    killTrackedDaemon()
    return { running: false, url: BATON_DAEMON_URL, pid: null, root: null, skills: null }
  }
  await installAllBatonSkills()
  return getBatonDaemonStatus()
}

export async function stopBatonDaemon(): Promise<BatonDaemonStatus> {
  killTrackedDaemon()
  clearSkillsSummary()
  const meta = await probeDaemonMeta()
  const pid = meta.pid ?? (await pidListeningOnPort(BATON_DAEMON_PORT))
  if (pid) {
    killDaemonPid(pid)
    await waitForDaemonGone()
  }
  return getBatonDaemonStatus()
}