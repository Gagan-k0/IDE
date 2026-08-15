export type BatonAvailability = {
  batonVersion: string | null
  nodeVersion: string | null
  gitAvailable: boolean
  uvAvailable: boolean
  graphifyAvailable: boolean
  error: string | null
}

export type BatonSetupResult = {
  ok: boolean
  output: string
  error: string | null
}

export type BatonDaemonStatus = {
  running: boolean
  url: string
  pid: number | null
  /** The repo folder the running daemon actually serves (from /api/meta). */
  root: string | null
}

export const BATON_DAEMON_PORT = 7077
export const BATON_DAEMON_URL = `http://127.0.0.1:${BATON_DAEMON_PORT}`
