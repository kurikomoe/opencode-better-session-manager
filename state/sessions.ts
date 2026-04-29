import type { BetterSessionConfig, SessionInfo } from "../session"
import type { TuiApi } from "../tui/types"
import { filterSessionScope, isActiveSession, markActive, normalizeActiveState } from "../session"
import { readActiveState, writeActiveState, activeStateKey } from "./active-state"

function asSessions(value: unknown): SessionInfo[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is SessionInfo => {
    if (!item || typeof item !== "object") return false
    const session = item as Partial<SessionInfo>
    return (
      typeof session.id === "string" &&
      typeof session.title === "string" &&
      !!session.time &&
      typeof session.time.created === "number" &&
      typeof session.time.updated === "number"
    )
  })
}

export async function loadSessions(api: TuiApi, config: BetterSessionConfig): Promise<SessionInfo[]> {
  const result = await api.client.session.list({
    roots: config.includeChildSessions ? undefined : true,
    limit: config.listLimit,
  })
  if (result.error) throw result.error
  return asSessions(result.data)
}

export function syncActiveState(api: TuiApi, sessions: readonly SessionInfo[], config: BetterSessionConfig) {
  const scoped = filterSessionScope(sessions, config.includeChildSessions)
  const state = readActiveState(api)
  const next = normalizeActiveState(
    scoped,
    scoped.reduce((current, session) => (session.id in current ? current : markActive(session.id, current)), state),
    { fallbackToLatest: Object.keys(state).length === 0 },
  )
  writeActiveState(api, next)
  return next
}

