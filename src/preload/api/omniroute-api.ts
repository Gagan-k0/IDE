import type {
  OmniRouteAvailability,
  OmniRouteServerStatus,
  OmniRouteSetupResult
} from '../../shared/omniroute-types'

export type OmniRouteApi = {
  getAvailability: () => Promise<OmniRouteAvailability>
  setupClaude: () => Promise<OmniRouteSetupResult>
  getServerStatus: () => Promise<OmniRouteServerStatus>
  startServer: () => Promise<OmniRouteServerStatus>
  stopServer: () => Promise<OmniRouteServerStatus>
}