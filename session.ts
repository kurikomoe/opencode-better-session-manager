export type SessionInfo = {
  id: string
  title: string
  parentID?: string
  time: {
    created: number
    updated: number
  }
}

export type ManualOverrides = Record<string, boolean>

export type BetterSessionConfig = {
  showSessionsKey: string
  cycleSessionKey: string
  openSessionListKey: string
  toggleActiveKey: string
  inactiveOthersKey: string
  includeChildSessions: boolean
  listLimit: number
  toastMaxSessions: number
  toastDurationMs: number
}

export type NormalizeActiveStateOptions = {
  fallbackToLatest?: boolean
}

export const DEFAULT_CONFIG: BetterSessionConfig = {
  showSessionsKey: "ctrl+o",
  cycleSessionKey: "ctrl+n",
  openSessionListKey: "ctrl+l",
  toggleActiveKey: "ctrl+f",
  inactiveOthersKey: "ctrl+k",
  includeChildSessions: false,
  listLimit: 200,
  toastMaxSessions: 8,
  toastDurationMs: 2000,
}

function finiteNumber(value: unknown, fallback: number, min = 0) {
  if (typeof value !== "number") return fallback
  if (!Number.isFinite(value)) return fallback
  if (value < min) return fallback
  return value
}

function booleanValue(value: unknown, fallback: boolean) {
  if (typeof value !== "boolean") return fallback
  return value
}

export function normalizeKeybind(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback
  const raw = value.trim()
  if (!raw) return fallback
  if (raw === "none") return raw
  return raw
    .replace(/^<ctrl[-+](.+)>$/i, "ctrl+$1")
    .replace(/^<leader>\+?/i, "<leader>")
    .replace(/\s+/g, "")
    .toLowerCase()
}

export function parseConfig(options: unknown): BetterSessionConfig {
  const input = options && typeof options === "object" ? (options as Record<string, unknown>) : {}

  return {
    showSessionsKey: normalizeKeybind(input.showSessionsKey, DEFAULT_CONFIG.showSessionsKey),
    cycleSessionKey: normalizeKeybind(input.cycleSessionKey, DEFAULT_CONFIG.cycleSessionKey),
    openSessionListKey: normalizeKeybind(input.openSessionListKey, DEFAULT_CONFIG.openSessionListKey),
    toggleActiveKey: normalizeKeybind(input.toggleActiveKey, DEFAULT_CONFIG.toggleActiveKey),
    inactiveOthersKey: normalizeKeybind(input.inactiveOthersKey, DEFAULT_CONFIG.inactiveOthersKey),
    includeChildSessions: booleanValue(input.includeChildSessions, DEFAULT_CONFIG.includeChildSessions),
    listLimit: Math.floor(finiteNumber(input.listLimit, DEFAULT_CONFIG.listLimit, 1)),
    toastMaxSessions: Math.floor(finiteNumber(input.toastMaxSessions, DEFAULT_CONFIG.toastMaxSessions, 1)),
    toastDurationMs: finiteNumber(input.toastDurationMs, DEFAULT_CONFIG.toastDurationMs, 0),
    enableManualOverride: booleanValue(input.enableManualOverride, DEFAULT_CONFIG.enableManualOverride),
  }
}

export function isRootSession(session: SessionInfo) {
  return session.parentID === undefined
}

export function isActiveSession(
  session: SessionInfo,
  activeState: ManualOverrides,
) {
  return activeState[session.id] === true
}

export function sortSessions(sessions: readonly SessionInfo[]) {
  return [...sessions].sort((a, b) => b.time.updated - a.time.updated || b.time.created - a.time.created)
}

export function filterSessionScope(sessions: readonly SessionInfo[], includeChildSessions: boolean) {
  if (includeChildSessions) return [...sessions]
  return sessions.filter(isRootSession)
}

export function activeSessions(
  sessions: readonly SessionInfo[],
  activeState: ManualOverrides,
  config: Pick<BetterSessionConfig, "includeChildSessions">,
) {
  const scoped = sortSessions(filterSessionScope(sessions, config.includeChildSessions))
  const normalized = normalizeActiveState(scoped, activeState, { fallbackToLatest: true })
  return scoped.filter((session) => isActiveSession(session, normalized))
}

export function normalizeActiveState(
  sessions: readonly SessionInfo[],
  activeState: ManualOverrides,
  options: NormalizeActiveStateOptions = {},
) {
  const scoped = sortSessions(sessions)
  const known = new Set(scoped.map((session) => session.id))
  const next = Object.fromEntries(
    Object.entries(activeState).filter(([sessionID, active]) => typeof active === "boolean" && known.has(sessionID)),
  ) as ManualOverrides
  if (Object.values(next).some(Boolean)) return next
  if (options.fallbackToLatest === false) return next
  const latest = scoped[0]
  if (!latest) return next
  return { ...next, [latest.id]: true }
}

export function markActive(sessionID: string, activeState: ManualOverrides) {
  return {
    ...activeState,
    [sessionID]: true,
  }
}

export function toggleActiveState(
  session: SessionInfo,
  sessions: readonly SessionInfo[],
  activeState: ManualOverrides,
) {
  const next = {
    ...activeState,
    [session.id]: !activeState[session.id],
  }
  return normalizeActiveState(sessions, next, { fallbackToLatest: false })
}

export function nextActiveSessionID(
  sessions: readonly SessionInfo[],
  currentSessionID: string | undefined,
  activeState: ManualOverrides,
  config: Pick<BetterSessionConfig, "includeChildSessions">,
) {
  const list = activeSessions(sessions, activeState, config)
  if (!list.length) return
  const index = list.findIndex((session) => session.id === currentSessionID)
  return list[index < 0 ? 0 : (index + 1) % list.length]?.id
}
