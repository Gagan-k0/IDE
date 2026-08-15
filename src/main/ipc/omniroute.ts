import { ipcMain } from 'electron'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import type {
  OmniRouteAvailability,
  OmniRouteServerStatus,
  OmniRouteSetupResult
} from '../../shared/omniroute-types'
import { resolveCliCommand } from '../../shared/node-cli-command-resolution'
import { getOmniRouteServerStatus, startOmniRouteServer, stopOmniRouteServer } from './omniroute-server'
import { captureCommandOutput } from './omniroute-server-process'

const SETUP_TIMEOUT_MS = 5 * 60 * 1000

async function probeCommandVersion(command: string, args: string[]): Promise<string | null> {
  const resolved = resolveCliCommand(command)
  if (resolved === command && !existsSync(resolved)) {
    return null
  }
  const result = await captureCommandOutput(resolved, args, {
    cwd: homedir(),
    timeoutMs: 5_000
  })
  const version = `${result.stdout.trim()}\n${result.stderr.trim()}`.trim()
  return version || null
}

async function getAvailability(): Promise<OmniRouteAvailability> {
  const omniRouteVersion = await probeCommandVersion('omniroute', ['--version'])
  const nodeVersion = await probeCommandVersion('node', ['--version'])
  const claudeAvailable = (await probeCommandVersion('claude', ['--version'])) !== null
  return {
    omniRouteVersion,
    nodeVersion,
    claudeCodeAvailable: claudeAvailable,
    error: null
  }
}

async function runSetupClaude(): Promise<OmniRouteSetupResult> {
  const command = resolveCliCommand('omniroute')
  const result = await captureCommandOutput(command, ['setup-claude'], {
    cwd: homedir(),
    timeoutMs: SETUP_TIMEOUT_MS
  })
  const output = `${result.stdout}\n${result.stderr}`.trim()
  if (result.code === null) {
    return { ok: false, output, error: 'OmniRoute setup-claude failed to complete.' }
  }
  return {
    ok: result.code === 0,
    output,
    error: result.code === 0 ? null : `omniroute setup-claude exited with code ${result.code}.`
  }
}

export function registerOmniRouteHandlers(): void {
  ipcMain.handle('omniroute:getAvailability', (): Promise<OmniRouteAvailability> => getAvailability())
  ipcMain.handle('omniroute:setupClaude', (): Promise<OmniRouteSetupResult> => runSetupClaude())
  ipcMain.handle('omniroute:getServerStatus', (): Promise<OmniRouteServerStatus> =>
    getOmniRouteServerStatus()
  )
  ipcMain.handle('omniroute:startServer', (): Promise<OmniRouteServerStatus> => startOmniRouteServer())
  ipcMain.handle('omniroute:stopServer', (): Promise<OmniRouteServerStatus> => stopOmniRouteServer())
}