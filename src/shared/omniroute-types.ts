export type OmniRouteAvailability = {
  omniRouteVersion: string | null
  nodeVersion: string | null
  claudeCodeAvailable: boolean
  error: string | null
}

export type OmniRouteSetupResult = {
  ok: boolean
  output: string
  error: string | null
}

export type OmniRouteServerStatus = {
  running: boolean
  url: string
  pid: number | null
  version: string | null
}

export const OMNIROUTE_PORT = 20128
export const OMNIROUTE_URL = `http://127.0.0.1:${OMNIROUTE_PORT}`
export const OMNIROUTE_HEALTH_URL = `${OMNIROUTE_URL}/api/monitoring/health`