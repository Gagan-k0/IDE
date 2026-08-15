import { spawn, type ChildProcess } from 'node:child_process'
import { homedir } from 'node:os'
import type { OmniRouteServerStatus } from '../../shared/omniroute-types'
import { OMNIROUTE_PORT, OMNIROUTE_URL } from '../../shared/omniroute-types'
import { resolveCliCommand } from '../../shared/node-cli-command-resolution'
import { getSpawnArgsForWindows } from '../win32-utils'
import {
  isOmniRouteReachable,
  killDaemonPid,
  pidListeningOnPort,
  probeOmniRouteHealth,
  waitForOmniRouteGone,
  waitForOmniRouteReady
} from './omniroute-server-process'

let trackedServerChild: ChildProcess | null = null
let currentServerPid: number | null = null

export async function getOmniRouteServerStatus(): Promise<OmniRouteServerStatus> {
  const running = await isOmniRouteReachable()
  const meta = running ? await probeOmniRouteHealth() : null
  return {
    running,
    url: OMNIROUTE_URL,
    pid: meta?.pid ?? currentServerPid,
    version: meta?.version ?? null
  }
}

function killTrackedServer(): void {
  const child = trackedServerChild
  trackedServerChild = null
  currentServerPid = null
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

export async function startOmniRouteServer(): Promise<OmniRouteServerStatus> {
  const meta = await probeOmniRouteHealth()
  if (meta.pid) {
    trackedServerChild = null
    currentServerPid = meta.pid
    return getOmniRouteServerStatus()
  }
  const foreignPid = await pidListeningOnPort(OMNIROUTE_PORT)
  if (foreignPid) {
    killDaemonPid(foreignPid)
    await waitForOmniRouteGone()
  }
  if (await isOmniRouteReachable()) {
    return { running: false, url: OMNIROUTE_URL, pid: null, version: null }
  }
  killTrackedServer()
  const command = resolveCliCommand('omniroute')
  const { spawnCmd, spawnArgs } = getSpawnArgsForWindows(command, [
    'serve',
    '--no-open',
    '--port',
    String(OMNIROUTE_PORT)
  ])
  const child = spawn(spawnCmd, spawnArgs, {
    cwd: homedir(),
    stdio: 'ignore',
    detached: true,
    windowsHide: true
  })
  const childPid = child.pid ?? null
  trackedServerChild = child
  currentServerPid = childPid
  child.unref()
  child.once('exit', () => {
    if (trackedServerChild === child) {
      trackedServerChild = null
    }
    if (currentServerPid === childPid) {
      currentServerPid = null
    }
  })

  const ready = await waitForOmniRouteReady()
  if (!ready) {
    killTrackedServer()
    return { running: false, url: OMNIROUTE_URL, pid: null, version: null }
  }
  const after = await probeOmniRouteHealth()
  currentServerPid = after.pid ?? childPid
  return getOmniRouteServerStatus()
}

export async function stopOmniRouteServer(): Promise<OmniRouteServerStatus> {
  killTrackedServer()
  const meta = await probeOmniRouteHealth()
  const pid = meta.pid ?? (await pidListeningOnPort(OMNIROUTE_PORT))
  if (pid) {
    killDaemonPid(pid)
    await waitForOmniRouteGone()
  }
  return getOmniRouteServerStatus()
}