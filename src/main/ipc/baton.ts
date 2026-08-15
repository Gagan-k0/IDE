import { ipcMain } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { BatonAvailability, BatonDaemonStatus, BatonSetupResult } from '../../shared/baton-types'
import { resolveCliCommand } from '../../shared/node-cli-command-resolution'
import {
  getBatonDaemonStatus,
  isExistingDirectory,
  startBatonDaemon,
  stopBatonDaemon
} from './baton-daemon'
import { captureCommandOutput } from './baton-daemon-process'

const SETUP_TIMEOUT_MS = 5 * 60 * 1000

async function probeCommandVersion(command: string, args: string[]): Promise<string | null> {
  const resolved = resolveCliCommand(command)
  if (resolved === command && !existsSync(resolved)) {
    return null
  }
  const result = await captureCommandOutput(resolved, args, {
    cwd: process.cwd(),
    timeoutMs: 5_000
  })
  const version = `${result.stdout.trim()}\n${result.stderr.trim()}`.trim()
  return version || null
}

async function getAvailability(): Promise<BatonAvailability> {
  const batonVersion = await probeCommandVersion('baton', ['--version'])
  const nodeVersion = await probeCommandVersion('node', ['--version'])
  const gitVersion = await probeCommandVersion('git', ['--version'])
  const uvVersion = await probeCommandVersion('uv', ['--version'])
  const graphifyVersion = await probeCommandVersion('graphifyy', ['--version'])
  return {
    batonVersion,
    nodeVersion,
    gitAvailable: gitVersion !== null,
    uvAvailable: uvVersion !== null,
    graphifyAvailable: graphifyVersion !== null,
    error: null
  }
}

async function runSetup(folderPath: string): Promise<BatonSetupResult> {
  if (!isExistingDirectory(folderPath)) {
    return { ok: false, output: '', error: 'The selected folder no longer exists.' }
  }
  const command = resolveCliCommand('baton')
  const result = await captureCommandOutput(command, ['setup', '--yes', '--local', '--serve', folderPath], {
    cwd: folderPath,
    timeoutMs: SETUP_TIMEOUT_MS
  })
  const output = `${result.stdout}\n${result.stderr}`.trim()
  if (result.code === null) {
    return { ok: false, output, error: 'Baton setup failed to complete.' }
  }
  return { ok: result.code === 0, output, error: result.code === 0 ? null : `baton setup exited with code ${result.code}.` }
}

function isSetupComplete(folderPath: string): boolean {
  return existsSync(join(folderPath, '.baton'))
}

export function registerBatonHandlers(): void {
  ipcMain.handle('baton:getAvailability', (): Promise<BatonAvailability> => getAvailability())
  ipcMain.handle(
    'baton:setup',
    (_event, folderPath: string): Promise<BatonSetupResult> => runSetup(folderPath)
  )
  ipcMain.handle('baton:getDaemonStatus', (): Promise<BatonDaemonStatus> => getBatonDaemonStatus())
  ipcMain.handle(
    'baton:startDaemon',
    (_event, folderPath: string): Promise<BatonDaemonStatus> => startBatonDaemon(folderPath)
  )
  ipcMain.handle('baton:stopDaemon', (): Promise<BatonDaemonStatus> => stopBatonDaemon())
  ipcMain.handle('baton:isSetupComplete', (_event, folderPath: string): boolean => {
    return isExistingDirectory(folderPath) && isSetupComplete(folderPath)
  })
}