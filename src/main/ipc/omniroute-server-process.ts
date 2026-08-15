import { OMNIROUTE_HEALTH_URL } from '../../shared/omniroute-types'

export type OmniRouteHealthMeta = {
  version: string | null
  pid: number | null
}

// Why: reuse the generic process helpers (spawn/cmd shim, port/pid lookups)
// shared with the Baton daemon rather than duplicating Windows plumbing.
export { captureCommandOutput, killDaemonPid, pidListeningOnPort } from './baton-daemon-process'

export async function isOmniRouteReachable(): Promise<boolean> {
  try {
    const response = await fetch(OMNIROUTE_HEALTH_URL, { signal: AbortSignal.timeout(2_000) })
    return response.ok
  } catch {
    return false
  }
}

export async function probeOmniRouteHealth(): Promise<OmniRouteHealthMeta> {
  try {
    const response = await fetch(OMNIROUTE_HEALTH_URL, { signal: AbortSignal.timeout(2_000) })
    if (!response.ok) {
      return { version: null, pid: null }
    }
    const body = (await response.json()) as {
      version?: unknown
      system?: { pid?: unknown }
    }
    return {
      version: typeof body.version === 'string' ? body.version : null,
      pid: typeof body.system?.pid === 'number' ? body.system.pid : null
    }
  } catch {
    return { version: null, pid: null }
  }
}

export async function waitForOmniRouteGone(timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!(await isOmniRouteReachable())) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
}

export async function waitForOmniRouteReady(timeoutMs = 60_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await isOmniRouteReachable()) {
      return true
    }
    await new Promise((resolve) => setTimeout(resolve, 750))
  }
  return false
}