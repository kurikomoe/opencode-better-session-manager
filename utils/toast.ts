import type { SessionInfo } from "../session"

const FOCUS_PREFIX = "-> "
const FOCUS_PADDING = " ".repeat(FOCUS_PREFIX.length)

export function windowAroundFocus(sessions: readonly SessionInfo[], focusID: string | undefined, maxSessions: number) {
  if (sessions.length <= maxSessions) return sessions
  const focusIndex = Math.max(0, sessions.findIndex((session) => session.id === focusID))
  const half = Math.floor(maxSessions / 2)
  const start = Math.min(Math.max(0, focusIndex - half), Math.max(0, sessions.length - maxSessions))
  return sessions.slice(start, start + maxSessions)
}

export function formatActiveToastMessage(sessions: readonly SessionInfo[], focusID: string | undefined, maxSessions: number) {
  const shown = windowAroundFocus(sessions, focusID, maxSessions)
  const start = sessions.findIndex((session) => session.id === shown[0]?.id)
  const before = Math.max(0, start)
  const after = Math.max(0, sessions.length - before - shown.length)
  const prefix = before > 0 ? `${FOCUS_PADDING}… +${before} before\n` : ""
  const suffix = after > 0 ? `\n${FOCUS_PADDING}… +${after} more` : ""
  return `${prefix}${shown
    .map((session, index) => {
      const marker = session.id === focusID ? FOCUS_PREFIX : FOCUS_PADDING
      return `${marker}${start + index + 1}. ${session.title}`
    })
    .join("\n")}${suffix}`
}

