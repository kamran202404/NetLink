# NetLink — Claude Code Context

## What this project is

LAN-only P2P desktop app (video/audio calls, chat, file transfer). Tauri v2 + React + TypeScript. No internet, no servers. See [README.md](README.md) for full overview.

## Design reference

The pixel-perfect prototype lives in **[docs/design/NetLink.html](docs/design/NetLink.html)**. Open it in a browser to see the target UI. All component files it references are in the same folder (`docs/design/*.jsx`).

Key design files to read before touching UI:
- `docs/design/app.jsx` — root layout, tab switching, state wiring
- `docs/design/sidebar.jsx` — peer list, avatar, signal bars
- `docs/design/calls.jsx` — ActiveCall with PiP, NoActiveCall with quick-call grid
- `docs/design/chats.jsx` — message thread, bubble styles, DataChannel footer
- `docs/design/files.jsx` — transfer rows, progress bars, sliding-window highlight
- `docs/design/modals.jsx` — IncomingCallModal (pulsing rings), SettingsModal (sidebar nav)
- `docs/design/data.jsx` — mock data shapes (ME, PEERS, MESSAGES, TRANSFERS) — matches TypeScript types

Design tokens (CSS vars defined in `NetLink.html` `<style>`):
```
--bg / --bg-2 / --surface / --surface-2   dark slate backgrounds
--line / --line-soft                       borders
--text / --text-dim / --text-mute         text hierarchy
--accent   oklch(0.82 0.16 165)           electric mint — online, primary actions
--warn     oklch(0.82 0.13 75)            amber — in-call, warnings
--danger   oklch(0.68 0.19 25)            red — end call, destructive
--mono     JetBrains Mono                 IPs, hashes, byte counts, durations
--sans     Inter                          all other UI text
```

## Architecture rules (must follow)

Full rationale in [STACK.md](STACK.md). Short version:

1. **Feature folders** — each feature owns its component(s), Zustand slice, and types in `src/features/<feature>/`. Export only through `index.ts`. Never import from another feature's internal files.

2. **Typed Tauri boundary** — all `invoke()` calls go through `src/tauri/commands.ts`. All `listen()` calls go through the `useTauriEvent` hook with the `TauriEvents` map in `src/tauri/events.ts`. No raw `invoke<any>` anywhere.

3. **Protocol union** — all DataChannel control messages are variants of `ControlMessage` in `packages/core/src/protocol.ts`. Use `msg satisfies never` in switch defaults so the compiler catches unhandled cases.

4. **`packages/core` is pure TypeScript** — zero imports from `@tauri-apps/*`, `react`, or the browser `File` API. This keeps it testable and reusable.

5. **`App.tsx` is layout glue only** — no business logic, just renders `<Sidebar>`, the active tab view, and modals. Should stay short.

6. **One Zustand slice per feature** — slices don't import from each other. Cross-feature communication uses Tauri events or narrow shared hooks.

## Implementation plan

See [PLAN.md](PLAN.md) — 14 phases (0–13). Check the status table there for what's done.

## Commands

```bash
pnpm install          # install all workspace deps
pnpm dev              # Tauri dev server with hot reload
pnpm build            # build all packages + Tauri app
pnpm typecheck        # tsc --noEmit across all packages
pnpm lint             # eslint across all packages
pnpm test             # vitest (packages/core unit tests)
```
