import { translate } from '@/i18n/i18n'
import { translateSearchKeyword } from './settings-search-keywords'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'

export const getBatonPaneSearchEntries = createLocalizedCatalog(() => [
  {
    title: translate(
      'auto.components.settings.baton.search.title',
      'Baton multi-agent coordination'
    ),
    description: translate(
      'auto.components.settings.baton.search.description',
      'Set up Baton for the open folder, start its daemon, and open the coordination dashboard.'
    ),
    keywords: [
      ...translateSearchKeyword(
        'auto.components.settings.baton.search.keywordBaton',
        'baton'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.baton.search.keywordMultiAgent',
        'multi-agent'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.baton.search.keywordCoordination',
        'coordination'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.baton.search.keywordDashboard',
        'dashboard'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.baton.search.keywordWorktree',
        'worktree'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.baton.search.keywordHandoff',
        'handoff'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.baton.search.keywordKnowledge',
        'knowledge base'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.baton.search.keywordGraph',
        'graph'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.baton.search.keywordSetup',
        'setup'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.baton.search.keywordAgents',
        'agents'
      )
    ]
  }
])
