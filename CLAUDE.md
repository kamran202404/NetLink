# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

LAN-only P2P desktop app — video/audio calls, chat, file transfer — for macOS/Windows/Linux. Tauri v2 (Rust backend) + React + TypeScript. No internet, no servers, no STUN/TURN. See [README.md](README.md) for full feature list and architecture overview.

## Commands

```bash
pnpm install                        # install all workspace deps (run from root)
pnpm dev                            # Tauri dev server with hot reload
pnpm build                          # build all packages + Tauri app
pnpm typecheck                      # tsc --noEmit across all packages
pnpm lint                           # eslint across all packages
pnpm test                           # vitest for packages/core unit tests
pnpm test --filter packages/core    # run tests for a single package
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml  # Rust tests
```

> Commands become available after Phase 1 (monorepo scaffold). See [PLAN.md](PLAN.md) for current phase.

## Design reference

The pixel-perfect UI prototype is in **`docs/design/`** — open `NetLink.html` in a browser. Read the corresponding `.jsx` files directly before writing any UI component; they contain exact dimensions, colors, and interaction logic. Key files:

| File | What it shows |
|---|---|
| `docs/design/app.jsx` | Root layout, tab state, call/chat/files wiring |
| `docs/design/sidebar.jsx` | Peer list, avatar, signal bars, me-card |
| `docs/design/calls.jsx` | ActiveCall (PiP layout), NoActiveCall (quick-call grid), call controls |
| `docs/design/chats.jsx` | Message bubbles, read receipts, typing indicator, DataChannel footer |
| `docs/design/files.jsx` | Transfer rows, progress bars, sliding-window highlight, offered state |
| `docs/design/modals.jsx` | IncomingCallModal (pulsing rings), SettingsModal (6-tab sidebar nav) |
| `docs/design/data.jsx` | Mock data shapes — `ME`, `PEERS`, `MESSAGES`, `TRANSFERS` — match the TS types |

Design tokens (CSS vars, dark mode defaults):
```
--accent   oklch(0.82 0.16 165)   electric mint  — online, active, primary buttons
--warn     oklch(0.82 0.13  75)   amber          — in-call status, warnings
--danger   oklch(0.68 0.19  25)   red            — end call, destructive actions
--mono     JetBrains Mono         — IPs, hashes, byte counts, durations, peer IDs
--sans     Inter                  — all other UI text
```

## Architecture

Full rules and rationale in [STACK.md](STACK.md). The critical ones:

**Feature folders** — `src/features/<name>/` owns its components, Zustand slice, and types. Export only through `index.ts`; never import another feature's internal files directly.

**Tauri boundary** — all `invoke()` calls live in `src/tauri/commands.ts`; all `listen()` calls use the `useTauriEvent<K>` hook typed against `TauriEvents` in `src/tauri/events.ts`. No raw `invoke<any>` or `listen()` outside these two files.

**Protocol messages** — DataChannel control messages are a discriminated union (`ControlMessage`) in `packages/core/src/protocol.ts`. Always use `default: msg satisfies never` in switch statements for exhaustiveness.

**`packages/core`** — pure TypeScript, zero imports from `@tauri-apps/*` or `react`. This package must stay independently testable.

## Monorepo layout

```
apps/desktop/src/
  features/         one folder per feature (peers, calls, chats, files, settings)
  shared/           Avatar, Button, Toast — components used by multiple features
  tauri/            commands.ts + events.ts — the only place Tauri APIs are called
  App.tsx           layout glue only, no business logic

packages/core/      framework-agnostic TS: PeerConnection, FileTransferManager, protocol types
packages/ui/        shared React + Tailwind primitives (buttons, inputs)

apps/desktop/src-tauri/src/
  commands.rs       all #[tauri::command] functions
  mdns.rs           mDNS advertising + browser task → emits peer-discovered / peer-lost
  signaling.rs      tokio-tungstenite WebSocket server for LAN signaling
```

## Tauri ↔ frontend contract

Rust emits events; frontend reacts via `useTauriEvent`. Rust exposes commands; frontend calls via `tauriCommands`. The shapes of both are the source of truth for the JS↔Rust boundary — if the Rust side changes, update `commands.ts` or `events.ts` first so TypeScript catches mismatches.

WebRTC signaling flow: frontend tells Tauri to connect to a peer's WS address → SDP/ICE exchanged over that socket → `simple-peer` takes over for media once ICE completes. ICE uses host-only candidates (`iceServers: []`).
