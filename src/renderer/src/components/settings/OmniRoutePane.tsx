import { useCallback, useEffect, useState } from 'react'
import { Cable, ExternalLink, Loader2, Play, Square } from 'lucide-react'
import { Button } from '../ui/button'
import { SearchableSetting } from './SearchableSetting'
import { matchesSettingsSearch } from './settings-search'
import { useAppStore } from '../../store'
import { useActiveWorktreeId } from '@/store/selectors'
import { getOmniRoutePaneSearchEntries } from './omniroute-search'
import { translate } from '@/i18n/i18n'
import type {
  OmniRouteAvailability,
  OmniRouteClaudeConfig,
  OmniRouteConfigureClaudeResult,
  OmniRouteServerStatus
} from '../../../../shared/omniroute-types'
import { OMNIROUTE_URL } from '../../../../shared/omniroute-types'

type OmniRoutePaneState = {
  availability: OmniRouteAvailability | null
  server: OmniRouteServerStatus | null
  claudeConfig: OmniRouteClaudeConfig | null
  checking: boolean
  starting: boolean
  setupRunning: boolean
  setupOutput: string | null
  setupError: string | null
}

export function OmniRoutePane(): React.JSX.Element {
  const searchQuery = useAppStore((s) => s.settingsSearchQuery)
  const showOmniRoute = matchesSettingsSearch(searchQuery, getOmniRoutePaneSearchEntries())
  const activeWorktreeId = useActiveWorktreeId()
  const createBrowserTab = useAppStore((s) => s.createBrowserTab)
  const [state, setState] = useState<OmniRoutePaneState>({
    availability: null,
    server: null,
    claudeConfig: null,
    checking: true,
    starting: false,
    setupRunning: false,
    setupOutput: null,
    setupError: null
  })

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, checking: true }))
    const [availability, server, claudeConfig] = await Promise.all([
      window.api.omniRoute.getAvailability(),
      window.api.omniRoute.getServerStatus(),
      window.api.omniRoute.getClaudeConfig()
    ])
    setState((prev) => ({
      ...prev,
      availability,
      server,
      claudeConfig,
      checking: false
    }))
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleSetupClaude = useCallback(async () => {
    setState((prev) => ({ ...prev, setupRunning: true, setupError: null, setupOutput: null }))
    let setup: OmniRouteConfigureClaudeResult | null = null
    try {
      setup = await window.api.omniRoute.configureClaude()
      setState((prev) => ({
        ...prev,
        setupOutput: setup?.output ?? null,
        claudeConfig: setup
          ? { settingsPath: setup.settingsPath, configured: setup.configured }
          : prev.claudeConfig
      }))
      if (!setup?.ok) {
        setState((prev) => ({
          ...prev,
          setupError: setup?.error ?? 'OmniRoute configure-claude failed.'
        }))
      }
    } finally {
      setState((prev) => ({ ...prev, setupRunning: false }))
    }
  }, [])

  const handleStart = useCallback(async () => {
    setState((prev) => ({ ...prev, starting: true, setupError: null, setupOutput: null }))
    const server = await window.api.omniRoute.startServer()
    setState((prev) => ({ ...prev, starting: false, server }))
    if (server.running) {
      if (state.availability?.claudeCodeAvailable && !state.claudeConfig?.configured) {
        await handleSetupClaude()
      }
      if (activeWorktreeId) {
        createBrowserTab(activeWorktreeId, OMNIROUTE_URL, {
          title: translate('auto.components.settings.OmniRoutePane.dashboardTitle', 'OmniRoute Dashboard'),
          activate: true
        })
      }
    }
  }, [activeWorktreeId, createBrowserTab, handleSetupClaude, state.availability, state.claudeConfig])

  const handleStop = useCallback(async () => {
    const server = await window.api.omniRoute.stopServer()
    setState((prev) => ({ ...prev, server }))
  }, [])

  const handleOpenDashboard = useCallback(() => {
    if (!activeWorktreeId) {
      return
    }
    createBrowserTab(activeWorktreeId, OMNIROUTE_URL, {
      title: translate('auto.components.settings.OmniRoutePane.dashboardTitle', 'OmniRoute Dashboard'),
      activate: true
    })
  }, [activeWorktreeId, createBrowserTab])

  if (!showOmniRoute) {
    return <div />
  }

  const availability = state.availability
  const server = state.server
  const ready = Boolean(availability?.omniRouteVersion)

  return (
    <SearchableSetting
      title={translate('auto.components.settings.OmniRoutePane.title', 'OmniRoute AI gateway')}
      description={translate(
        'auto.components.settings.OmniRoutePane.description',
        'Run the OmniRoute gateway, generate Claude Code profiles for each model, and open the dashboard.'
      )}
      keywords={getOmniRoutePaneSearchEntries()[0].keywords}
      className="space-y-5 py-2"
    >
      {state.checking ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {translate('auto.components.settings.OmniRoutePane.checking', 'Checking OmniRoute...')}
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/30 p-4">
          <div className="flex items-center gap-2">
            <Cable className="size-5 text-foreground" />
            <p className="text-sm font-medium text-foreground">
              {translate('auto.components.settings.OmniRoutePane.status', 'Status')}
            </p>
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <p className="text-muted-foreground">
              {!ready
                ? translate(
                    'auto.components.settings.OmniRoutePane.notInstalled',
                    'OmniRoute CLI is not installed on this computer. Install it with: npm install -g omniroute'
                  )
                : translate(
                    'auto.components.settings.OmniRoutePane.installed',
                    'OmniRoute CLI v{{version}} — ready',
                    { version: availability?.omniRouteVersion ?? '' }
                  )}
            </p>
            {availability?.omniRouteVersion ? (
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
                <li>
                  {translate('auto.components.settings.OmniRoutePane.nodeLabel', 'Node')}:{' '}
                  {availability?.nodeVersion ?? '—'}
                </li>
                <li>
                  {translate('auto.components.settings.OmniRoutePane.claudeLabel', 'Claude Code')}:{' '}
                  {availability?.claudeCodeAvailable ? '✓' : '✗'}
                </li>
              </ul>
            ) : null}
            <p className="mt-2 text-muted-foreground">
              {translate('auto.components.settings.OmniRoutePane.serverLabel', 'Gateway server')}:{' '}
              {server?.running
                ? translate('auto.components.settings.OmniRoutePane.serverRunning', 'Running on {{url}}', {
                    url: OMNIROUTE_URL
                  })
                : translate('auto.components.settings.OmniRoutePane.serverStopped', 'Stopped')}
            </p>
            {server?.running && server.version ? (
              <p className="mt-1 text-muted-foreground">
                {translate('auto.components.settings.OmniRoutePane.serverVersion', 'Server version')}:{' '}
                {server.version}
              </p>
            ) : null}
            {server?.running && server.pid ? (
              <p className="mt-1 text-muted-foreground">
                {translate('auto.components.settings.OmniRoutePane.pidLabel', 'PID')}: {server.pid}
              </p>
            ) : null}
            {availability?.claudeCodeAvailable ? (
              <p className="mt-1 text-muted-foreground">
                {translate('auto.components.settings.OmniRoutePane.claudeConfigLabel', 'Claude Code')}:{' '}
                {state.claudeConfig?.configured
                  ? translate(
                      'auto.components.settings.OmniRoutePane.claudeConfigured',
                      'Configured for OmniRoute'
                    )
                  : translate(
                      'auto.components.settings.OmniRoutePane.claudeNotConfigured',
                      'Not configured for OmniRoute'
                    )}
              </p>
            ) : null}
          </div>
        </div>
      )}

      {state.setupOutput ? (
        <pre className="max-h-64 overflow-auto scrollbar-sleek whitespace-pre-wrap rounded-lg border border-border/60 bg-background p-3 font-mono text-xs text-muted-foreground">
          {state.setupOutput}
        </pre>
      ) : null}

      {state.setupError ? (
        <p className="text-sm text-destructive">{state.setupError}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="default"
          onClick={() => void handleStart()}
          disabled={!ready || state.starting || state.checking}
        >
          {state.starting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Play className="size-4" />
          )}
          {state.starting
            ? translate('auto.components.settings.OmniRoutePane.starting', 'Starting...')
            : translate('auto.components.settings.OmniRoutePane.start', 'Start OmniRoute')}
        </Button>
        <Button
          variant="outline"
          onClick={() => void handleOpenDashboard()}
          disabled={!server?.running || !activeWorktreeId}
        >
          <ExternalLink className="size-4" />
          {translate('auto.components.settings.OmniRoutePane.openDashboard', 'Open Dashboard')}
        </Button>
        <Button
          variant="outline"
          onClick={() => void handleSetupClaude()}
          disabled={!ready || state.setupRunning}
        >
          {state.setupRunning ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Cable className="size-4" />
          )}
          {translate('auto.components.settings.OmniRoutePane.setupClaude', 'Configure Claude Code')}
        </Button>
        <Button
          variant="ghost"
          onClick={() => void handleStop()}
          disabled={!server?.running || state.starting}
        >
          <Square className="size-4" />
          {translate('auto.components.settings.OmniRoutePane.stop', 'Stop')}
        </Button>
      </div>
    </SearchableSetting>
  )
}