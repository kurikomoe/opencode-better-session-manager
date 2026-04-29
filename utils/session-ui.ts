import type { BetterSessionConfig, ManualOverrides, SessionInfo } from "../session"
import { filterSessionScope, isActiveSession } from "../session"
import type { DialogSelectOption } from "../tui/types"

export function sessionDescription(sessionID: string) {
  const trimmed = sessionID.replace(/^ses_/, "")
  return trimmed.slice(0, 8)
}

export function formatRelativeTime(time: number) {
  const diff = Date.now() - time
  if (diff < 60_000) return "just now"
  if (diff < 60 * 60_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 24 * 60 * 60_000) return `${Math.floor(diff / (60 * 60_000))}h ago`
  return `${Math.floor(diff / (24 * 60 * 60_000))}d ago`
}

export function dayCategory(time: number) {
  const date = new Date(time)
  if (date.toDateString() === new Date().toDateString()) return "Today"
  return date.toDateString()
}

export function activeMark(session: SessionInfo, activeState: ManualOverrides) {
  if (isActiveSession(session, activeState)) return "active"
  return "inactive"
}

export function orderedSessions(sessions: readonly SessionInfo[], activeState: ManualOverrides, config: BetterSessionConfig) {
  return [...sessions].sort((a, b) => {
    const activeA = isActiveSession(a, activeState)
    const activeB = isActiveSession(b, activeState)
    if (activeA !== activeB) return activeA ? -1 : 1
    return b.time.updated - a.time.updated || b.time.created - a.time.created
  })
}

export function sessionOptions(
  sessions: readonly SessionInfo[],
  activeState: ManualOverrides,
  config: BetterSessionConfig,
  toDelete?: string,
): DialogSelectOption<string>[] {
  return orderedSessions(sessions, activeState, config).map((session) => ({
    title: toDelete === session.id ? "Press ctrl+d again to confirm" : session.title,
    value: session.id,
    description: sessionDescription(session.id),
    category: isActiveSession(session, activeState) ? "Active" : dayCategory(session.time.updated),
    footer: `${activeMark(session, activeState)} · ${formatRelativeTime(session.time.updated)}`,
  }))
}

