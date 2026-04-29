import { createEffect } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import { TextAttributes, type TextareaRenderable } from "@opentui/core"

export function RenamePrompt(props: { value: string; onConfirm: (value: string) => void; onCancel: () => void }) {
  let textarea: TextareaRenderable | undefined

  useKeyboard((evt) => {
    if (evt.name === "escape") {
      evt.preventDefault?.()
      evt.stopPropagation?.()
      props.onCancel()
    }
    if (evt.name === "return") {
      evt.preventDefault?.()
      evt.stopPropagation?.()
      if (!textarea) return
      props.onConfirm(textarea.plainText)
    }
  })

  // Ensure the textarea gets keyboard focus when the dialog opens.
  // (OpenCode's native dialog-prompt does the same via createEffect + setTimeout.)
  createEffect(() => {
    if (!textarea) return
    const t = setTimeout(() => {
      if (!textarea) return
      textarea.focus()
      textarea.gotoLineEnd()
    }, 1)
    return () => clearTimeout(t)
  })

  return (
    <box paddingLeft={2} paddingRight={2} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD}>Rename Session</text>
        <text onMouseUp={() => props.onCancel()}>esc</text>
      </box>
      <box gap={1}>
        <textarea
          height={3}
          keyBindings={[{ name: "return", action: "submit" }]}
          ref={(val: TextareaRenderable) => {
            textarea = val
          }}
          initialValue={props.value}
          placeholder="输入新名称"
          onSubmit={() => {
            if (!textarea) return
            props.onConfirm(textarea.plainText)
          }}
        />
      </box>
      <box paddingBottom={1} gap={1} flexDirection="row">
        <text>enter submit</text>
      </box>
    </box>
  )
}

