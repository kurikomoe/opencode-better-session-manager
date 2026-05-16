import type { BetterSessionConfig, ManualOverrides, SessionInfo } from "../session"

export type ParsedKey = {
  name?: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  super?: boolean
  preventDefault?: () => void
  stopPropagation?: () => void
}

export type KeybindInfo = {
  name: string
  ctrl: boolean
  meta: boolean
  shift: boolean
  super: boolean
  leader: boolean
}

export type DialogSelectOption<Value> = {
  title: string
  value: Value
  description?: string
  footer?: unknown
  category?: string
  categoryView?: unknown
  disabled?: boolean
  bg?: unknown
  gutter?: unknown
  margin?: unknown
  onSelect?: () => void
}

export type TuiApi = {
  command: {
    register(cb: () => {
      title: string
      value: string
      description?: string
      category?: string
      keybind?: string
      hidden?: boolean
      enabled?: boolean
      onSelect?: () => void
    }[]): () => void
  }
  route: {
    current: { name: string; params?: Record<string, unknown> }
    navigate(name: string, params?: Record<string, unknown>): void
  }
  ui: {
    DialogSelect<Value>(props: {
      title: string
      placeholder?: string
      options: DialogSelectOption<Value>[]
      flat?: boolean
      onMove?: (option: DialogSelectOption<Value>) => void
      onFilter?: (query: string) => void
      onSelect?: (option: DialogSelectOption<Value>) => void
      current?: Value
      keybind?: {
        keybind?: KeybindInfo
        title: string
        disabled?: boolean
        onTrigger: (option: DialogSelectOption<Value>) => void
      }[]
    }): unknown
    toast(input: { variant?: "info" | "success" | "warning" | "error"; title?: string; message: string; duration?: number }): void
    dialog: {
      replace(render: () => unknown): void
      clear(): void
      setSize(size: "medium" | "large" | "xlarge"): void
    }
  }
  keybind?: {
    match(key: string, evt: ParsedKey): boolean
    print(key: string): string
  }
  kv: {
    get<Value = unknown>(key: string, fallback?: Value): Value
    set(key: string, value: unknown): void
  }
  client: {
    session: {
      list(parameters?: { roots?: boolean; limit?: number }): Promise<{ data?: unknown; error?: unknown }>
      delete(parameters: { sessionID: string }): Promise<{ error?: unknown }>
      update(parameters: { sessionID: string; title: string }): Promise<{ error?: unknown }>
    }
  }
  // Note: BetterSessionConfig/ManualOverrides/SessionInfo are imported to keep
  // this module flexible for future exports, even if unused for now.
  _typecheck?: BetterSessionConfig | ManualOverrides | SessionInfo
}
