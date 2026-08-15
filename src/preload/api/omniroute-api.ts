import type {
  OmniRouteAvailability,
  OmniRouteClaudeConfig,
  OmniRouteConfigureClaudeResult,
  OmniRouteServerStatus
} from '../../shared/omniroute-types'

export type OmniRouteApi = {
  getAvailability: () => Promise<OmniRouteAvailability>
  getServerStatus: () => Promise<OmniRouteServerStatus>
  startServer: () => Promise<OmniRouteServerStatus>
  stopServer: () => Promise<OmniRouteServerStatus>
  getClaudeConfig: () => Promise<OmniRouteClaudeConfig>
  configureClaude: () => Promise<OmniRouteConfigureClaudeResult>
}