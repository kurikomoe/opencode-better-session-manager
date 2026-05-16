import { batch, createMemo, createSignal, onMount, untrack } from "solid-js"
import { useKeyboard, useRenderer, useTerminalDimensions } from "@opentui/solid"
import type { TextareaRenderable } from "@opentui/core"
import type { BetterSessionConfig, ManualOverrides, SessionInfo } from "../session"
import { activeSessions, isActiveSession, toggleActiveState, normalizeActiveState, filterSessionScope } from "../session"
import { formatActiveToastMessage } from "../utils/toast"
import { loadSessions as loadSessionsIO, syncActiveState as syncActiveStateIO } from "../state/sessions"
import { readActiveState as readActiveStateKV, writeActiveState as writeActiveStateKV } from "../state/active-state"
import { orderedSessions as orderedSessionsUI, sessionOptions as sessionOptionsUI } from "../utils/session-ui"
import { RenamePrompt } from "./RenamePrompt"
import type { TuiApi } from "./types"

function currentSessionID(api: TuiApi) {
  const sessionID = api.route.current.params?.sessionID
  return typeof sessionID === "string" ? sessionID : undefined
}

export function SessionList(props: { api: TuiApi; config: BetterSessionConfig }) {
  const dimensions = useTerminalDimensions()
  const renderer = useRenderer()
  const [sessions, setSessions] = createSignal<SessionInfo[]>([])
  const [activeState, setActiveState] = createSignal<ManualOverrides>(readActiveStateKV(props.api))
  const [selected, setSelected] = createSignal<string | undefined>(currentSessionID(props.api))
  const [filterQuery, setFilterQuery] = createSignal("")
  const [busy, setBusy] = createSignal(true)
  const [toDelete, setToDelete] = createSignal<string | undefined>(undefined)
  const options = createMemo(() => sessionOptionsUI(sessions(), activeState(), props.config, toDelete()))

  // DialogSelect auto-focuses its filter input; blur it so ctrl shortcuts work
  onMount(() => {
    setTimeout(() => {
      const focused = renderer.currentFocusedRenderable
      if (focused && !focused.isDestroyed) {
        focused.blur()
      }
    }, 10)
  })

  const reload = async () => {
    setBusy(true)
    await loadSessionsIO(props.api, props.config)
      .then((list) => {
        const state = syncActiveStateIO(props.api, list, props.config)
        const routeID = currentSessionID(props.api)
        const target = selected() ?? routeID ?? list[0]?.id
        batch(() => {
          setSessions(list)
          setActiveState(state)
        })
        setSelected(undefined)
        setSelected(target)
      })
      .catch((error) => {
        props.api.ui.toast({ variant: "error", title: "无法加载会话列表", message: error instanceof Error ? error.message : String(error) })
      })
      .finally(() => setBusy(false))
  }

  const toggleSelected = (id?: string) => {
    const preOptions = options()
    const selectedSessionID = id ?? selected()
    if (!selectedSessionID) {
      props.api.ui.toast({ variant: "warning", message: "[debug] selected() 为空", duration: 4000 })
      return
    }

    const scopedSessions = filterSessionScope(sessions(), props.config.includeChildSessions)
    const selectedSession = scopedSessions.find((item) => item.id === selectedSessionID)
    if (!selectedSession) {
      props.api.ui.toast({
        variant: "warning",
        message: `[debug] selected=${selectedSessionID.slice(-6)} 不在 scoped 列表`,
        duration: 4000,
      })
      return
    }

    const selectedOptionIndex = preOptions.findIndex((item) => item.value === selectedSessionID)
    if (selectedOptionIndex < 0) {
      props.api.ui.toast({
        variant: "warning",
        message: `[debug] selected=${selectedSessionID.slice(-6)} 不在 preOptions`,
        duration: 4000,
      })
      return
    }

    const preActiveState = activeState()
    const nextCandidateID =
      preOptions[selectedOptionIndex + 1]?.value ??
      preOptions[selectedOptionIndex - 1]?.value ??
      selectedSessionID

    const wasActive = preActiveState[selectedSession.id] === true
    const nextActiveState = toggleActiveState(selectedSession, sessions(), preActiveState)
    const postOptions = sessionOptionsUI(scopedSessions, nextActiveState, props.config, toDelete())
    const nextSelectedID =
      postOptions.find((item) => item.value === nextCandidateID)?.value ??
      postOptions[Math.min(selectedOptionIndex, Math.max(postOptions.length - 1, 0))]?.value ??
      selectedSessionID

    setToDelete(undefined)

    setSelected(undefined)
    batch(() => {
      setActiveState(nextActiveState)
      setSelected(nextSelectedID)
    })
    writeActiveStateKV(props.api, nextActiveState)

    const tail = (id?: string) => (id ? id.slice(-6) : "∅")
    props.api.ui.toast({
      variant: wasActive ? "info" : "success",
      title: `${wasActive ? "取消激活" : "激活"}: ${selectedSession.title}`,
      message:
        `[debug] sel=${tail(selectedSessionID)} idx=${selectedOptionIndex} ` +
        `cand=${tail(nextCandidateID)} next=${tail(nextSelectedID)} ` +
        `pre[0..2]=${tail(preOptions[0]?.value)},${tail(preOptions[1]?.value)},${tail(preOptions[2]?.value)} ` +
        `post[0..2]=${tail(postOptions[0]?.value)},${tail(postOptions[1]?.value)},${tail(postOptions[2]?.value)}`,
      duration: 8000,
    })
  }

  const inactiveOthers = (id?: string) => {
    const preOptions = options()
    const sessionID = id ?? selected() ?? preOptions[0]?.value
    const session = sessions().find((item) => item.id === sessionID)
    if (!session) return
    setToDelete(undefined)
    const next = normalizeActiveState(
      sessions(),
      Object.fromEntries(filterSessionScope(sessions(), props.config.includeChildSessions).map((item) => [item.id, item.id === session.id])),
      { fallbackToLatest: false },
    )
    writeActiveStateKV(props.api, next)
    setSelected(undefined)
    batch(() => {
      setActiveState(next)
      setSelected(session.id)
    })
  }

  useKeyboard((evt) => {
    const keyName = evt.name?.toLowerCase()
    if (evt.ctrl && keyName === "d") {
      evt.preventDefault?.()
      evt.stopPropagation?.()
      void (async () => {
        const sessionID = selected() ?? options()[0]?.value
        if (!sessionID) return
        if (toDelete() === sessionID) {
          try {
            const result = await props.api.client.session.delete({ sessionID })
            if (result.error) {
              props.api.ui.toast({ variant: "error", title: "无法删除会话", message: String(result.error) })
              setToDelete(undefined)
              return
            }
            setToDelete(undefined)
            await reload()
          } catch (err) {
            props.api.ui.toast({ variant: "error", title: "无法删除会话", message: err instanceof Error ? err.message : String(err) })
            setToDelete(undefined)
          }
          return
        }
        setToDelete(sessionID)
      })()
      return
    }

    if (evt.ctrl && keyName === "r") {
      evt.preventDefault?.()
      evt.stopPropagation?.()
      const sessionID = selected() ?? options()[0]?.value
      const session = sessions().find((s) => s.id === sessionID)
      if (!session) return
      props.api.ui.dialog.replace(() => (
        <RenamePrompt
          value={session.title}
          onCancel={() => props.api.ui.dialog.replace(() => SessionList({ api: props.api, config: props.config }))}
          onConfirm={(value) => {
            void props.api.client.session
              .update({ sessionID: session.id, title: value })
              .then((result) => {
                if (result.error) {
                  props.api.ui.toast({ variant: "error", title: "无法重命名会话", message: String(result.error) })
                  return
                }
                props.api.ui.dialog.replace(() => SessionList({ api: props.api, config: props.config }))
              })
              .catch((err) => {
                props.api.ui.toast({ variant: "error", title: "无法重命名会话", message: err instanceof Error ? err.message : String(err) })
              })
          }}
        />
      ))
      return
    }

    if (evt.ctrl && keyName === "f") {
      evt.preventDefault?.()
      evt.stopPropagation?.()
      toggleSelected()
      return
    }

    if (evt.ctrl && keyName === "k") {
      evt.preventDefault?.()
      evt.stopPropagation?.()
      inactiveOthers()
      return
    }
  })

  props.api.ui.dialog.setSize(untrack(() => (dimensions().width >= 120 ? "xlarge" : "large")))
  void untrack(reload)

  return props.api.ui.DialogSelect<string>({
    get title() {
      return busy()
        ? "会话（加载中...）"
        : `会话（${options().length}）| ctrl+f 切换选中 · ctrl+k 仅选中本会话 · ctrl+r 重命名会话 · ctrl+d 删除会话`;
    },
    placeholder: "搜索会话",
    get options() {
      return options()
    },
    get current() {
      if (filterQuery().trim().length > 0) return undefined
      return selected()
    },
    onFilter: (query: string) => setFilterQuery(query),
    flat: true,
    onMove: (option) => {
      setToDelete(undefined)
      setSelected(option.value)
    },
    onSelect: (option) => {
      props.api.route.navigate("session", { sessionID: option.value })
      props.api.ui.dialog.clear()
      const list = activeSessions(sessions(), activeState(), props.config)
      if (list.length) {
        props.api.ui.toast({
          variant: "info",
          title: `当前激活的会话 (${list.length})`,
          message: formatActiveToastMessage(list, option.value, props.config.toastMaxSessions),
          duration: props.config.toastDurationMs,
        })
      }
    },
  })
}
