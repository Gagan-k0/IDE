import { useCallback, useEffect, useState } from 'react'
import { Loader2, Play, Square, ExternalLink, Network } from 'lucide-react'
import { Button } from '../ui/button'
import { SearchableSetting } from './SearchableSetting'
import { matchesSettingsSearch } from './settings-search'
import { useAppStore } from '../../store'
import { useActiveWorktree, useActiveWorktreeId } from '@/store/selectors'
import { getBatonPaneSearchEntries } from './baton-search'
import { translate } from '@/i18n/i18n'
import type {
  BatonAvailability,
  BatonDaemonStatus,
  BatonSetupResult
} from '../../../../shared/baton-types'
import { BATON_DAEMON_URL } from '../../../../shared/baton-types'

type BatonPaneState = {
  availability: BatonAvailability | null
  setupComplete: boolean | null
  daemon: BatonDaemonStatus | null
  checking: boolean
  starting: boolean
  setupOutput: string | null
  setupError: string | null
}

export function BatonPane(): React.JSX.Element {
  const searchQuery = useAppStore((s) => s.settingsSearchQuery)
  const showBaton = matchesSettingsSearch(searchQuery, getBatonPaneSearchEntries())
  const activeWorktree = useActiveWorktree()
  const activeWorktreeId = useActiveWorktreeId()
  const createBrowserTab = useAppStore((s) => s.createBrowserTab)
  const [state, setState] = useState<BatonPaneState>({
    availability: null,
    setupComplete: null,
    daemon: null,
    checking: true,
    starting: false,
    setupOutput: null,
    setupError: null
  })

  const folderPath = activeWorktree?.path ?? null

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, checking: true }))
    const [availability, daemon, setupComplete] = await Promise.all([
      window.api.baton.getAvailability(),
      window.api.baton.getDaemonStatus(),
      folderPath ? window.api.baton.isSetupComplete(folderPath) : Promise.resolve(false)
    ])
    setState((prev) => ({
      ...prev,
      availability,
      daemon,
      setupComplete,
      checking: false
    }))
  }, [folderPath])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleStart = useCallback(async () => {
    if (!folderPath) {
      return
    }
    setState((prev) => ({ ...prev, starting: true, setupError: null, setupOutput: null }))
    let setup: BatonSetupResult | null = null
    if (!state.setupComplete) {
      setup = await window.api.baton.setup(folderPath)
      setState((prev) => ({ ...prev, setupOutput: setup?.output ?? null }))
      if (!setup?.ok) {
        setState((prev) => ({
          ...prev,
          starting: false,
          setupError: setup?.error ?? 'Baton setup failed.'
        }))
        return
      }
    }
    const daemon = await window.api.baton.startDaemon(folderPath)
    setState((prev) => ({ ...prev, starting: false, daemon }))
    if (daemon.running && activeWorktreeId) {
      createBrowserTab(activeWorktreeId, BATON_DAEMON_URL, {
        title: translate('auto.components.settings.BatonPane.dashboardTitle', 'Baton Dashboard'),
        activate: true
      })
    }
  }, [folderPath, state.setupComplete, activeWorktreeId, createBrowserTab])

  const handleStop = useCallback(async () => {
    const daemon = await window.api.baton.stopDaemon()
    setState((prev) => ({ ...prev, daemon }))
  }, [])

  const handleOpenDashboard = useCallback(() => {
    if (!activeWorktreeId) {
      return
    }
    createBrowserTab(activeWorktreeId, BATON_DAEMON_URL, {
      title: translate('auto.components.settings.BatonPane.dashboardTitle', 'Baton Dashboard'),
      activate: true
    })
  }, [activeWorktreeId, createBrowserTab])

  if (!showBaton) {
    return <div />
  }

  const availability = state.availability
  const daemon = state.daemon
  const ready = Boolean(availability?.batonVersion)

  return (
    <SearchableSetting
      title={translate(
        'auto.components.settings.BatonPane.title',
        'Baton multi-agent coordination'
      )}
      description={translate(
        'auto.components.settings.BatonPane.description',
        'Set up Baton for the folder that is open, start its daemon, and open the coordination dashboard.'
      )}
      keywords={getBatonPaneSearchEntries()[0].keywords}
      className="space-y-5 py-2"
    >
      <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/30 p-4">
        <div className="flex items-center gap-2">
          <Network className="size-5 text-foreground" />
          <p className="text-sm font-medium text-foreground">
            {translate('auto.components.settings.BatonPane.currentFolder', 'Current folder')}
          </p>
        </div>
        <p className="text-sm text-muted-foreground break-all">{folderPath}</p>
        {!folderPath ? (
          <p className="text-sm text-destructive">
            {translate(
              'auto.components.settings.BatonPane.noFolder',
              'Open a folder first — Baton is set up for the workspace that is currently open.'
            )}
          </p>
        ) : null}
      </div>

      {state.checking ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {translate('auto.components.settings.BatonPane.checking', 'Checking Baton...')}
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/30 p-4">
          <div className="flex flex-col gap-1 text-sm">
            <p className="text-sm font-medium text-foreground">
              {translate('auto.components.settings.BatonPane.status', 'Status')}
            </p>
            <p className="text-muted-foreground">
              {!ready
                ? translate(
                    'auto.components.settings.BatonPane.notInstalled',
                    'Baton CLI is not installed on this computer. Install it with: npm install -g baton-cli'
                  )
                : translate(
                    'auto.components.settings.BatonPane.installed',
                    'Baton CLI v{{version}} — ready',
                    { version: availability?.batonVersion ?? '' }
                  )}
            </p>
            {availability?.batonVersion ? (
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
                <li>
                  {translate('auto.components.settings.BatonPane.nodeLabel', 'Node')}:{' '}
                  {availability?.nodeVersion ?? '—'}
                </li>
                <li>
                  {translate('auto.components.settings.BatonPane.gitLabel', 'Git')}:{' '}
                  {availability?.gitAvailable ? '✓' : '✗'}
                </li>
                <li>
                  {translate('auto.components.settings.BatonPane.uvLabel', 'uv')}:{' '}
                  {availability?.uvAvailable ? '✓' : '✗'}
                </li>
              </ul>
            ) : null}
            <p className="mt-2 text-muted-foreground">
              {translate(
                'auto.components.settings.BatonPane.setupLabel',
                'Baton setup for this folder'
              )}
              :{' '}
              {state.setupComplete === true
                ? translate('auto.components.settings.BatonPane.setupDone', 'Done')
                : state.setupComplete === false
                  ? translate(
                      'auto.components.settings.BatonPane.setupPending',
                      'Not yet — will run when you press Start Baton'
                    )
                  : '—'}
            </p>
            <p className="mt-1 text-muted-foreground">
              {translate('auto.components.settings.BatonPane.daemonLabel', 'Dashboard daemon')}:{' '}
              {daemon?.running
                ? translate('auto.components.settings.BatonPane.daemonRunning', 'Running on {{url}}', {
                    url: BATON_DAEMON_URL
                  })
                : translate('auto.components.settings.BatonPane.daemonStopped', 'Stopped')}
            </p>
            {daemon?.running && daemon.root ? (
              <p className="mt-1 text-muted-foreground break-all">
                {translate('auto.components.settings.BatonPane.servingLabel', 'Serving')}: {daemon.root}
              </p>
            ) : null}
            {daemon?.running && daemon.skills ? (
              <p className="mt-1 text-muted-foreground">
                {translate('auto.components.settings.BatonPane.skillsLabel', 'Skills installed')}:{' '}
                {daemon.skills.installed} / {daemon.skills.total}
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
          disabled={!ready || !folderPath || state.starting || state.checking}
        >
          {state.starting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Play className="size-4" />
          )}
          {state.starting
            ? translate('auto.components.settings.BatonPane.starting', 'Starting...')
            : translate('auto.components.settings.BatonPane.start', 'Start Baton')}
        </Button>
        <Button
          variant="outline"
          onClick={() => void handleOpenDashboard()}
          disabled={!daemon?.running || !activeWorktreeId}
        >
          <ExternalLink className="size-4" />
          {translate('auto.components.settings.BatonPane.openDashboard', 'Open Dashboard')}
        </Button>
        <Button
          variant="ghost"
          onClick={() => void handleStop()}
          disabled={!daemon?.running || state.starting}
        >
          <Square className="size-4" />
          {translate('auto.components.settings.BatonPane.stop', 'Stop')}
        </Button>
      </div>
    </SearchableSetting>
  )
}
