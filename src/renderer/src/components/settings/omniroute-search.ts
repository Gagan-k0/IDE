import { translate } from '@/i18n/i18n'
import { translateSearchKeyword } from './settings-search-keywords'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'

export const getOmniRoutePaneSearchEntries = createLocalizedCatalog(() => [
  {
    title: translate(
      'auto.components.settings.omniroute.search.title',
      'OmniRoute AI gateway'
    ),
    description: translate(
      'auto.components.settings.omniroute.search.description',
      'Run the OmniRoute gateway, set up Claude Code profiles, and open the dashboard.'
    ),
    keywords: [
      ...translateSearchKeyword(
        'auto.components.settings.omniroute.search.keywordOmniRoute',
        'omniroute'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.omniroute.search.keywordGateway',
        'gateway'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.omniroute.search.keywordRouter',
        'router'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.omniroute.search.keywordProxy',
        'proxy'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.omniroute.search.keywordClaude',
        'claude'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.omniroute.search.keywordProviders',
        'providers'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.omniroute.search.keywordFallback',
        'fallback'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.omniroute.search.keywordModel',
        'model'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.omniroute.search.keywordSetup',
        'setup'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.omniroute.search.keywordDashboard',
        'dashboard'
      )
    ]
  }
])