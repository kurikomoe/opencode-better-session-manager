# better-session-manager

OpenCode TUI plugin that adds an active-session workflow and a custom session list.

## Features

- `ctrl+o`: show active sessions in a toast.

- `ctrl+n`: cycle through active sessions.

- `ctrl+l`: open the custom session list.

- In the custom session list:
  - `ctrl+f`: toggle the selected session's active state.
  - `ctrl+k`: make the selected session active and all other scoped sessions inactive.
  - `ctrl+r`: rename the selected session.
  - `ctrl+d`: delete the selected session; press twice to confirm.
  
- Session list ordering: active sessions first, then most recently updated sessions.

  

Active sessions are stored in OpenCode TUI KV storage and restored on startup.

- If no active-state record exists yet, the latest scoped session becomes active.

- Newly discovered scoped sessions become active automatically.

- Explicitly inactive sessions remain inactive across restarts as long as at least one scoped session is active.

  

## Usage

```jsonc
// git clone this repo to your project path or ~/.config/opencode/plugins
{
  "plugin": [
    [
      // For use within a single project:
      // "file://{env:HOME}/.config/opencode/plugins/better-session-manager",

      // For use in the global config file (~/.config/opencode/tui.jsonc):
      "./plugins/better-session-manager",
      {
        "showSessionsKey": "ctrl+o",
        "cycleSessionKey": "ctrl+n",
        "openSessionListKey": "ctrl+l",
        "toggleActiveKey": "ctrl+f",
        "inactiveOthersKey": "ctrl+k",
        "includeChildSessions": false,
        "listLimit": 200,
        "toastMaxSessions": 8,
        "toastDurationMs": 2000
      }
    ]
  ]
}
```

Common keybind aliases are normalized:

- `<ctrl-l>` -> `ctrl+l`
- `<leader>+n` -> `<leader>n`

Set any command keybind to `"none"` to disable that shortcut while keeping the command available.



### Config options

| Option | Default | Description |
| --- | --- | --- |
| `showSessionsKey` | `"ctrl+o"` | Command keybind for showing active sessions in a toast. |
| `cycleSessionKey` | `"ctrl+n"` | Command keybind for jumping to the next active session. |
| `openSessionListKey` | `"ctrl+l"` | Command keybind for opening the custom session list. |
| `toggleActiveKey` | `"ctrl+f"` | Session-list keybind for toggling the selected session active/inactive. |
| `inactiveOthersKey` | `"ctrl+k"` | Session-list keybind for keeping only the selected session active. |
| `includeChildSessions` | `false` | Include child sessions when listing, cycling, and syncing active state. |
| `listLimit` | `200` | Maximum number of sessions requested from OpenCode. |
| `toastMaxSessions` | `8` | Maximum number of active sessions shown in a toast. |
| `toastDurationMs` | `2000` | Toast display duration in milliseconds. |



## Limitation

This plugin does not modify OpenCode's built-in session list. OpenCode's current plugin API does not expose a stable extension point for adding keybinds to the built-in `DialogSessionList`, so the plugin provides its own `DialogSelect`-based session list instead.



## Development

```bash
bun install
bun run typecheck
bun test
```
