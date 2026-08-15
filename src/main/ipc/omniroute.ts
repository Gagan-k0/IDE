import { ipcMain } from 'electron'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type {
  OmniRouteAvailability,
  OmniRouteClaudeConfig,
  OmniRouteConfigureClaudeResult,
  OmniRouteServerStatus,
  OmniRouteSetupResult
} from '../../shared/omniroute-types'
import { OMNIROUTE_URL } from '../../shared/omniroute-types'
import { resolveCliCommand } from '../../shared/node-cli-command-resolution'
import { getOmniRouteServerStatus, startOmniRouteServer, stopOmniRouteServer } from './omniroute-server'
import { captureCommandOutput } from './omniroute-server-process'

const SETUP_TIMEOUT_MS = 5 * 60 * 1000
const CLAUDE_HOME = join(homedir(), '.claude')
const CLAUDE_SETTINGS_PATH = join(CLAUDE_HOME, 'settings.json')
const CLAUDE_SETTINGS_BACKUP_PATH = `${CLAUDE_SETTINGS_PATH}.omniroute-backup`
// Why: mirrors `omniroute launch` — a sentinel keeps newer Claude Code from
// stopping at its login gate while an open OmniRoute backend ignores the value.
const OMNIROUTE_AUTH_SENTINEL = 'omniroute-no-auth'

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

function readClaudeSettings(): Record<string, unknown> {
  try {
    if (!existsSync(CLAUDE_SETTINGS_PATH)) {
      return {}
    }
    // Why: some editors write a UTF-8 BOM; JSON.parse rejects it, so strip it
    // to avoid silently dropping a user's existing settings on other machines.
    const raw = readFileSync(CLAUDE_SETTINGS_PATH, 'utf-8').replace(/^\uFEFF/, '')
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function isClaudeConfiguredForOmniRoute(): boolean {
  const settings = readClaudeSettings()
  const env = (settings.env ?? {}) as Record<string, unknown>
  return env.ANTHROPIC_BASE_URL === OMNIROUTE_URL
}

// Why: writes/merges the DEFAULT Claude Code settings.json (the one plain
// `claude` reads) so opening claude in any terminal routes through OmniRoute.
// Backs up the original first; leaves unrelated user settings untouched.
function writeClaudeSettingsForOmniRoute(): string | null {
  if (!existsSync(CLAUDE_HOME)) {
    mkdirSync(CLAUDE_HOME, { recursive: true })
  }
  if (existsSync(CLAUDE_SETTINGS_PATH) && !existsSync(CLAUDE_SETTINGS_BACKUP_PATH)) {
    copyFileSync(CLAUDE_SETTINGS_PATH, CLAUDE_SETTINGS_BACKUP_PATH)
  }
  const settings = readClaudeSettings()
  const env = {
    ...((settings.env ?? {}) as Record<string, string>),
    ANTHROPIC_BASE_URL: OMNIROUTE_URL,
    ANTHROPIC_AUTH_TOKEN: OMNIROUTE_AUTH_SENTINEL,
    ANTHROPIC_MODEL: 'auto',
    CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY: '1',
    CLAUDE_CODE_AUTO_COMPACT_WINDOW: '190000'
  }
  writeFileSync(
    CLAUDE_SETTINGS_PATH,
    `${JSON.stringify({ ...settings, env }, null, 2)}\n`,
    'utf-8'
  )
  return CLAUDE_SETTINGS_PATH
}

async function getClaudeConfig(): Promise<OmniRouteClaudeConfig> {
  return {
    settingsPath: CLAUDE_SETTINGS_PATH,
    configured: isClaudeConfiguredForOmniRoute()
  }
}

// Why: first-time setup — ensure the server is running, generate per-model
// profiles, then point the default claude command at OmniRoute. Idempotent.
async function runConfigureClaude(): Promise<OmniRouteConfigureClaudeResult> {
  const status = await getOmniRouteServerStatus()
  if (!status.running) {
    const started = await startOmniRouteServer()
    if (!started.running) {
      return {
        ok: false,
        output: '',
        error: 'OmniRoute server could not be started.',
        settingsPath: CLAUDE_SETTINGS_PATH,
        configured: isClaudeConfiguredForOmniRoute()
      }
    }
  }
  const setup = await runSetupClaude()
  const alreadyConfigured = isClaudeConfiguredForOmniRoute()
  let settingsPath: string | null = CLAUDE_SETTINGS_PATH
  let settingsError: string | null = null
  try {
    settingsPath = writeClaudeSettingsForOmniRoute()
  } catch (err) {
    settingsError = `Failed to write Claude Code settings: ${String(err)}`
  }
  const lines: string[] = []
  if (setup.output) {
    lines.push(setup.output)
  }
  if (settingsError) {
    lines.push(settingsError)
  } else if (!alreadyConfigured) {
    lines.push(`Claude Code configured for OmniRoute at ${settingsPath}.`)
  }
  return {
    ok: setup.ok && !settingsError,
    output: lines.join('\n').trim(),
    error: setup.error ?? settingsError,
    settingsPath,
    configured: isClaudeConfiguredForOmniRoute()
  }
}

export function registerOmniRouteHandlers(): void {
  ipcMain.handle('omniroute:getAvailability', (): Promise<OmniRouteAvailability> => getAvailability())
  ipcMain.handle('omniroute:getServerStatus', (): Promise<OmniRouteServerStatus> =>
    getOmniRouteServerStatus()
  )
  ipcMain.handle('omniroute:startServer', (): Promise<OmniRouteServerStatus> => startOmniRouteServer())
  ipcMain.handle('omniroute:stopServer', (): Promise<OmniRouteServerStatus> => stopOmniRouteServer())
  ipcMain.handle('omniroute:getClaudeConfig', (): Promise<OmniRouteClaudeConfig> => getClaudeConfig())
  ipcMain.handle('omniroute:configureClaude', (): Promise<OmniRouteConfigureClaudeResult> =>
    runConfigureClaude()
  )
}