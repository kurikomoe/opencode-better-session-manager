import type { BetterSessionConfig } from "../session"
import { activeSessions, nextActiveSessionID, parseConfig } from "../session"
import { loadSessions, syncActiveState } from "../state/sessions"
import { formatActiveToastMessage } from "../utils/toast"
import { SessionList } from "./SessionList"
import type { TuiApi } from "./types"
export { id } from "../state/active-state"

function keybind(configKey: string) {
  if (configKey === "none") return undefined
  return configKey
}

function currentSessionID(api: TuiApi) {
  const sessionID = api.route.current.params?.sessionID
  return typeof sessionID === "string" ? sessionID : undefined
}

async function showActiveToast(api: TuiApi, config: BetterSessionConfig) {
  const sessions = await loadSessions(api, config)
  const state = syncActiveState(api, sessions, config)
  const list = activeSessions(sessions, state, config)
  if (!list.length) {
    api.ui.toast({ variant: "info", title: "当前激活的会话", message: "没有激活的会话", duration: config.toastDurationMs })
    return
  }

  api.ui.toast({
    variant: "info",
    title: `当前激活的会话 (${list.length})`,
    message: formatActiveToastMessage(list, currentSessionID(api), config.toastMaxSessions),
    duration: config.toastDurationMs,
  })
}

async function cycleActiveSession(api: TuiApi, config: BetterSessionConfig) {
  const sessions = await loadSessions(api, config)
  const state = syncActiveState(api, sessions, config)
  const next = nextActiveSessionID(sessions, currentSessionID(api), state, config)
  if (!next) {
    api.ui.toast({ variant: "warning", message: "没有活跃的会话", duration: config.toastDurationMs })
    return
  }

  api.route.navigate("session", { sessionID: next })
  const list = activeSessions(sessions, state, config)
  api.ui.toast({
    variant: "info",
    title: `当前激活的会话 (${list.length})`,
    message: formatActiveToastMessage(list, next, config.toastMaxSessions),
    duration: config.toastDurationMs,
  })
}

function openSessionList(api: TuiApi, config: BetterSessionConfig) {
  api.ui.dialog.replace(() => SessionList({ api, config }))
}

async function guarded(task: Promise<void>, api: TuiApi) {
  await task.catch((error) => {
    api.ui.toast({ variant: "error", title: "better-session-manager", message: error instanceof Error ? error.message : String(error), duration: 5000 })
  })
}

export const tui = async (api: TuiApi, options?: unknown) => {
  const config = parseConfig(options)
  api.command.register(() => [
    {
      title: "显示活跃的会话",
      value: "better-session-manager.show-active",
      description: "显示活跃的会话",
      category: "Session",
      keybind: keybind(config.showSessionsKey),
      onSelect: () => void guarded(showActiveToast(api, config), api),
    },
    {
      title: "循环切换活跃的会话",
      value: "better-session-manager.cycle-active",
      category: "Session",
      keybind: keybind(config.cycleSessionKey),
      onSelect: () => void guarded(cycleActiveSession(api, config), api),
    },
    {
      title: "更好的会话列表",
      value: "better-session-manager.list",
      category: "Session",
      keybind: keybind(config.openSessionListKey),
      onSelect: () => openSessionList(api, config),
    },
  ])
}

