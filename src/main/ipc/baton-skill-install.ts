import type { BatonSkillInstallSummary } from '../../shared/baton-types'
import { BATON_DAEMON_URL } from '../../shared/baton-types'

let lastSkillsSummary: BatonSkillInstallSummary | null = null

export function getSkillsSummary(): BatonSkillInstallSummary | null {
  return lastSkillsSummary
}

export function clearSkillsSummary(): void {
  lastSkillsSummary = null
}

// Best-effort: installs every skill Baton ships into ALL writable agents for
// the root the daemon serves. Runs right after the daemon is verified so a
// freshly set-up folder has the full catalog ready, and re-runs on reuse.
export async function installAllBatonSkills(): Promise<void> {
  try {
    const catalog = await fetch(`${BATON_DAEMON_URL}/api/skills`, {
      headers: { Origin: BATON_DAEMON_URL },
      signal: AbortSignal.timeout(3_000)
    })
    if (!catalog.ok) {
      lastSkillsSummary = null
      return
    }
    const body = (await catalog.json()) as { skills?: { id?: unknown }[] }
    const ids = (body.skills ?? [])
      .map((skill) => skill.id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
    const failed: string[] = []
    for (const id of ids) {
      try {
        const response = await fetch(
          `${BATON_DAEMON_URL}/api/skills/${encodeURIComponent(id)}/install`,
          {
            method: 'POST',
            headers: { Origin: BATON_DAEMON_URL, 'Content-Type': 'application/json' },
            body: JSON.stringify({ agent: 'all' }),
            signal: AbortSignal.timeout(10_000)
          }
        )
        if (!response.ok) {
          failed.push(id)
        }
      } catch {
        failed.push(id)
      }
    }
    lastSkillsSummary = { total: ids.length, installed: ids.length - failed.length, failed }
  } catch {
    lastSkillsSummary = null
  }
}