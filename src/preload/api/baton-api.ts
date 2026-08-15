import type {
  BatonAvailability,
  BatonDaemonStatus,
  BatonSetupResult
} from '../../shared/baton-types'

export type BatonApi = {
  getAvailability: () => Promise<BatonAvailability>
  setup: (folderPath: string) => Promise<BatonSetupResult>
  getDaemonStatus: () => Promise<BatonDaemonStatus>
  startDaemon: (folderPath: string) => Promise<BatonDaemonStatus>
  stopDaemon: () => Promise<BatonDaemonStatus>
  isSetupComplete: (folderPath: string) => Promise<boolean>
}
