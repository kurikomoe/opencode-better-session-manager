import { describe, expect, test } from "bun:test"
import {
  DEFAULT_CONFIG,
  activeSessions,
  isActiveSession,
  nextActiveSessionID,
  normalizeActiveState,
  normalizeKeybind,
  parseConfig,
  toggleActiveState,
  type SessionInfo,
} from "./session"

const sessions: SessionInfo[] = [
  { id: "old", title: "old", time: { created: 1, updated: 1_000_000_000 - 10 * 60 * 60 * 1000 } },
  { id: "new", title: "new", time: { created: 2, updated: 1_000_000_000 - 60_000 } },
  { id: "child", title: "child", parentID: "new", time: { created: 3, updated: 1_000_000_000 - 30_000 } },
]

describe("session logic", () => {
  test("normalizes common keybind spellings", () => {
    expect(normalizeKeybind("<ctrl-l>", "x")).toBe("ctrl+l")
    expect(normalizeKeybind("<leader>+n", "x")).toBe("<leader>n")
  })

  test("parses renamed config keys", () => {
    const config = parseConfig({
      showSessionsKey: "ctrl+s",
      cycleSessionKey: "<leader>j",
      openSessionListKey: "ctrl+shift+s",
      toggleActiveKey: "ctrl+t",
      inactiveOthersKey: "ctrl+g",
    })

    expect(config.showSessionsKey).toBe("ctrl+s")
    expect(config.cycleSessionKey).toBe("<leader>j")
    expect(config.openSessionListKey).toBe("ctrl+shift+s")
    expect(config.toggleActiveKey).toBe("ctrl+t")
    expect(config.inactiveOthersKey).toBe("ctrl+g")
  })

  test("isActiveSession requires explicit active=true", () => {
    expect(isActiveSession(sessions[0]!, { old: true })).toBe(true)
    expect(isActiveSession(sessions[0]!, { old: false })).toBe(false)
  })

  test("falls back to latest session when no active state exists", () => {
    expect(activeSessions(sessions, {}, DEFAULT_CONFIG).map((item) => item.id)).toEqual(["new"])
  })

  test("filters active root sessions by saved state", () => {
    expect(activeSessions(sessions, { old: true, new: true }, DEFAULT_CONFIG).map((item) => item.id)).toEqual(["new", "old"])
  })

  test("can normalize without latest fallback for explicit all-inactive state", () => {
    expect(
      normalizeActiveState(
        sessions.filter((session) => !session.parentID),
        { old: false, new: false },
        { fallbackToLatest: false },
      ),
    ).toEqual({ old: false, new: false })
  })

  test("cycles after current active session", () => {
    const config = { ...DEFAULT_CONFIG, includeChildSessions: true }
    expect(nextActiveSessionID(sessions, "child", { child: true, new: true }, config)).toBe("new")
    expect(nextActiveSessionID(sessions, "new", { child: true, new: true }, config)).toBe("child")
  })

  test("toggles active state without forcing fallback", () => {
    expect(toggleActiveState(sessions[1]!, sessions, { new: true })).toEqual({ new: false })
    expect(toggleActiveState(sessions[0]!, sessions, { new: true })).toEqual({ old: true, new: true })
  })
})
