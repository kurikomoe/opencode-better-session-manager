import type { TuiApi } from "../tui/types"
import type { ManualOverrides } from "../session"

export const id = "better-session-manager"
export const activeStateKey = `${id}:active-state`

export function readActiveState(api: TuiApi): ManualOverrides {
  const value = api.kv.get<unknown>(activeStateKey, {})
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"),
  )
}

export function writeActiveState(api: TuiApi, state: ManualOverrides) {
  api.kv.set(activeStateKey, { ...state })
}

