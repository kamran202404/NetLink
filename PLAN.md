# NetLink — Implementation Plan

> Implementation order is sequential. Each phase must pass its own acceptance criteria before moving to the next.
>
> Before writing any feature code, read [STACK.md](STACK.md) — specifically the **Code Organization Principles** section. The rules there (feature folders, file size budget, typed boundaries) are enforced throughout.

---

## Phase 0 — Architectural Guardrails

**Goal**: The skeleton enforces the right boundaries before any feature code is written. These constraints prevent the codebase from becoming a ball of mud as features are added.

### Tasks
- [ ] `src/tauri/events.ts` — `TauriEvents` interface + `useTauriEvent<K>` typed hook (empty map, filled as backend emits events)
- [ ] `src/tauri/commands.ts` — `tauriCommands` object with typed `invoke()` wrappers (empty, filled as commands are added)
- [ ] `packages/core/src/protocol.ts` — `ControlMessage` discriminated union with exhaustiveness helper
- [ ] `packages/core/src/types.ts` — shared `Peer`, `Message`, `Transfer` types
- [ ] `src/features/` directory created with `peers/`, `calls/`, `chats/`, `files/`, `settings/` stubs (each with empty `index.ts`)
- [ ] ESLint rule: no imports from `@/features/*/` internal files (only `@/features/*` index allowed)
- [ ] ESLint rule: no Tauri or React imports in `packages/core`
- [ ] `tsconfig.base.json` path aliases: `@/` → `src/`, `@netlink/core` → `packages/core/src`

### Acceptance
- `pnpm lint` passes on an empty codebase
- `packages/core` cannot accidentally import from `@tauri-apps/api` (lint rule blocks it)
- All TypeScript paths resolve correctly

---

## Phase 1 — Monorepo Scaffold

**Goal**: Runnable skeleton. `pnpm dev` starts the Tauri window showing "Hello NetLink".

### Tasks
- [ ] `pnpm-workspace.yaml` referencing `apps/*` and `packages/*`
- [ ] Root `package.json` with workspace scripts (`dev`, `build`, `lint`, `typecheck`)
- [ ] `tsconfig.base.json` with strict mode, path aliases
- [ ] `.gitignore` additions for Rust targets
- [ ] `apps/desktop/` — Tauri v2 + Vite + React + TypeScript bootstrap
- [ ] `apps/desktop/src-tauri/` — minimal `main.rs`, `tauri.conf.json`
- [ ] `packages/core/` — empty TS lib with `package.json`, `tsconfig.json`
- [ ] `packages/ui/` — React + Tailwind lib with `package.json`, `tsconfig.json`
- [ ] Verify: `pnpm install && pnpm dev` launches Tauri window

### Acceptance
- Tauri window opens, no console errors
- `pnpm typecheck` exits 0 across all packages

---

## Phase 2 — Design System & Global Styles

**Goal**: The app shell looks exactly like the NetLink design: dark slate background, accent mint, Inter + JetBrains Mono.

### Tasks
- [ ] CSS custom properties in `global.css` mirroring the design tokens:
  ```css
  --bg, --bg-2, --surface, --surface-2
  --line, --line-soft
  --text, --text-dim, --text-mute
  --accent, --accent-dim
  --warn, --danger
  --mono, --sans
  ```
- [ ] Tailwind config wired to use these CSS vars as named colors
- [ ] Google Fonts: `Inter` (400–700) + `JetBrains Mono` (400–600)
- [ ] Scrollbar styles (thin, themed)
- [ ] Base resets (box-sizing, body overflow:hidden, antialiasing)
- [ ] `Icon` component — inline SVG set matching the design (Phone, Video, Mic, Chat, File, Settings, etc.)
- [ ] `Avatar` component — colored circle with initials / service icon + status dot
- [ ] `Button` variants (default, primary, danger, ghost, sm)
- [ ] `Tooltip` via `title` attribute (native, matches design)

### Acceptance
- App background is `oklch(0.165 0.012 250)`, text is `oklch(0.96 0.005 250)`
- Icons render at correct sizes and stroke weights

---

## Phase 3 — App Shell & Navigation

**Goal**: The 3-tab layout is clickable and stateful.

### Tasks
- [ ] `App.tsx` — fixed viewport grid: topbar 44px + body (sidebar 280px + main)
- [ ] `TopBar` — macOS traffic lights placeholder, NetLink logo + name, tabs, LAN pill, Bell + Settings icon buttons
- [ ] Tabs (`Calls`, `Chats`, `Files`) with badge support
- [ ] `LAN pill` — pulsing green dot + IP address (from `useSettingsStore`)
- [ ] `Toast` system — bottom-center stack, auto-dismiss 3.5s, `useToast()` hook
- [ ] Subtle stippled radial-gradient background overlay
- [ ] `useSettingsStore` — `localId`, `displayName`, `ip`, `hostname`, `port`

### Acceptance
- Clicking tabs switches content area
- Toast appears/disappears when triggered

---

## Phase 4 — Sidebar & Peer List

**Goal**: Sidebar shows mock peers with correct styling.

### Tasks
- [ ] `Sidebar` component — me-card, search input, discovery banner, peer list
- [ ] `SigBars` — 4-bar signal strength indicator
- [ ] `PeerRow` — avatar, name, IP, signal bars, last-seen, unread badge / phone button
- [ ] `usePeerStore` — `peers: Map<id, Peer>`, `activePeerId`, actions
- [ ] Peer grouping: "On the network" (online/in-call) vs "Idle"
- [ ] Search filters by name, hostname, IP
- [ ] Sidebar footer: `🔒 direct · no relay` + wifi network name
- [ ] Mock peers wired from `data.ts` (matching the design's PEERS array)

### Acceptance
- Sidebar renders all mock peers with correct colors and status dots
- Search filters list live

---

## Phase 5 — Chats View

**Goal**: Fully interactive chat thread for the selected peer.

### Tasks
- [ ] `ChatsView` — header, scrollable message list, input bar, tech footer
- [ ] `ChatHeader` — peer avatar + name + status + hostname:IP:port, call/video/file buttons
- [ ] `MessageBubble` — sent/received alignment, accent background for outgoing
- [ ] Read receipts: `sent` → `delivered` → `read` with ✓✓ indicator
- [ ] `FileAttachment` bubble — icon, name, size, SHA-256 verified, Save button
- [ ] Day separator pill
- [ ] DataChannel banner (when `showTech` is true)
- [ ] Typing indicator (animated dots)
- [ ] `useChatStore` — `messages: Map<peerId, Message[]>`, `unreadCounts`
- [ ] `onSend` handler simulating delivery → read with timeouts
- [ ] Tech footer: DTLS-SRTP fingerprint + message count + last ack

### Acceptance
- Sending a message shows it immediately, then delivered, then read within 1.5s
- Scrolls to bottom on new message

---

## Phase 6 — Calls View

**Goal**: No-call state with quick-call cards; active call with fullscreen PiP layout.

### Tasks
- [ ] `NoActiveCall` — hero banner with NetworkGlyph SVG animation, quick-call grid, call history rows
- [ ] `NetworkGlyph` — animated YOU ↔ PEER SVG (moving packets)
- [ ] `CallHistoryRow` — direction icon, peer, duration, timestamp, recall button
- [ ] `ActiveCall` — remote video stage (full), local PiP (bottom-right 200×130), status pill, tech overlay
- [ ] `VideoSurface` — placeholder gradient + stripe pattern + initials watermark + name plate + mic icon
- [ ] `CallControl` button — 48px circle, icon, label, active/inactive states, danger variant
- [ ] Control bar — Mute, Stop video, Share screen, Audio, Chat, Send file, More, End
- [ ] Chat panel toggle (side panel when in-call + on Calls tab)
- [ ] `useCallStore` — `inCall: string|null`, `muted`, `videoOff`, `screenshare`, `speaker`, `duration`
- [ ] Duration timer (ticks every second while `inCall` is set)
- [ ] Call initiation from peer list / chat header / NoActiveCall grid

### Acceptance
- Start call: transitions to ActiveCall view, timer starts
- End call: returns to NoActiveCall, toast shows duration

---

## Phase 7 — Files View

**Goal**: Live transfer list with progress simulation.

### Tasks
- [ ] `FilesView` — header with stats strip + filter tabs, offered/active/completed sections, drop zone
- [ ] `TransferRow` — file icon, name+size, SHA-256 hash, progress bar, sliding-window highlight, speed/ETA, actions
- [ ] Offered state: amber highlight, Accept/Decline buttons
- [ ] Transferring state: animated progress bar + sliding window marker
- [ ] Complete state: "✓ COMPLETE" badge, Reveal button
- [ ] `Stat` mini-stat widget (label + large mono number)
- [ ] Filter bar: All / Active / Incoming / Outgoing / Done
- [ ] `useFileStore` — `transfers: Map<id, Transfer>`, actions (`accept`, `decline`, `cancel`, `pause`)
- [ ] Progress simulation: 1-second interval increments `sent` by `speed/size`
- [ ] Drop zone at bottom

### Acceptance
- Active transfers animate progress every second
- Accepting an offered file moves it to "In progress" and starts progress

---

## Phase 8 — Modals

**Goal**: Incoming call modal and Settings modal match the design exactly.

### Tasks
- [ ] `IncomingCallModal` — pulsing rings, avatar, peer name + address, Decline / Audio / Accept buttons
- [ ] Ring animation keyframes
- [ ] `SettingsModal` — sidebar nav + content area (Identity, Devices, Network, Storage, Appearance, Advanced tabs)
- [ ] Identity tab: display name input, peer ID (read-only + copy), hostname/signaling endpoint
- [ ] Devices tab: camera select, mic select with level bar, speaker select
- [ ] Network tab: mDNS service name, interface select, ICE policy, signaling port
- [ ] Storage tab: download folder, chat history export/clear
- [ ] Appearance tab: dark/light/system theme toggle, (accent color selector wired to CSS var)
- [ ] Advanced tab: placeholder
- [ ] Modal scrim with blur backdrop, fade + scale animation
- [ ] `SField` and `SSelect` settings form helpers

### Acceptance
- Incoming call modal shows with pulsing rings
- Settings modal opens, tabs switch content, display name input is editable

---

## Phase 9 — Tauri Backend (Rust)

**Goal**: Real mDNS discovery and WebSocket signaling. Frontend receives real `peer-discovered` events.

### Tasks
- [ ] `get_local_peer_info()` — returns UUID (generated on first launch, persisted) + display name
- [ ] `set_display_name(name)` — persists via `tauri-plugin-store`
- [ ] `start_mdns_advertising(port)` — broadcasts `_p2pchat._tcp.local`
- [ ] `stop_mdns()` — stops advertising
- [ ] mDNS browser task — emits `peer-discovered` / `peer-lost` to frontend
- [ ] `WebSocket signaling server` — listens on random port, proxies signaling messages via Tauri events
- [ ] `get_local_signaling_address()` — returns `ws://192.168.x.x:PORT`

### Acceptance
- Two machines on the same LAN discover each other within 3 seconds

---

## Phase 10 — WebRTC Integration

**Goal**: Real 1-to-1 video/audio call between two machines.

### Tasks
- [ ] `PeerConnection` class in `packages/core`
  - Wraps `simple-peer`
  - Creates 3 DataChannels on connection
  - Exposes `call()`, `hangup()`, `sendMessage()`, `sendFileOffer()`
- [ ] Frontend wires signaling messages from Tauri events → simple-peer
- [ ] `getUserMedia` for camera + microphone
- [ ] Attaches remote stream to `<video>` element
- [ ] Error handling: permission denied, peer unreachable

### Acceptance
- Two machines can exchange video + audio with no dropped frames on LAN

---

## Phase 11 — Chat DataChannel

**Goal**: Real messages sent via WebRTC DataChannel.

### Tasks
- [ ] `simple-peer` DataChannel "chat" integration in `PeerConnection`
- [ ] Messages: `{ id: uuid, senderId, text, timestamp }`
- [ ] Persist received messages to SQLite via `tauri-plugin-sql`
- [ ] Load history on peer connect
- [ ] Delivered ack via DataChannel

---

## Phase 12 — File Transfer

**Goal**: Real chunked file transfer between two machines.

### Tasks
- [ ] `FileTransferManager` class in `packages/core`
  - Handles chunking, backpressure, sliding window, NACK, resume
  - Emits `progress` events
- [ ] Sender: ReadableStream → 64KB chunks → DataChannel with backpressure
- [ ] Receiver: reassemble chunks, write to disk via Tauri fs plugin
- [ ] SHA-256 integrity check on completion
- [ ] Persist chunk bitmap to SQLite for resume
- [ ] Native file picker via `tauri-plugin-dialog`

---

## Phase 13 — Polish

**Goal**: Error handling, empty states, production-ready UX.

### Tasks
- [ ] Camera/mic permission denied: per-OS instructions
- [ ] Peer unreachable: retry UI with backoff
- [ ] File hash mismatch: re-request dialog
- [ ] DataChannel close mid-transfer: pause + resume on reconnect
- [ ] All Tauri command errors surface as toast notifications
- [ ] Light mode pass (currently lightly tuned)
- [ ] Minimum window size enforcement (800×600)
- [ ] App icon

---

## Current Status

> **Awaiting approval** — docs complete, no code written yet

| Phase | Status |
|---|---|
| 0 — Architectural Guardrails | ⬜ Pending |
| 1 — Monorepo Scaffold | ⬜ Pending |
| 2 — Design System | ⬜ Pending |
| 3 — App Shell | ⬜ Pending |
| 4 — Sidebar | ⬜ Pending |
| 5 — Chats | ⬜ Pending |
| 6 — Calls | ⬜ Pending |
| 7 — Files | ⬜ Pending |
| 8 — Modals | ⬜ Pending |
| 9 — Tauri Backend | ⬜ Pending |
| 10 — WebRTC | ⬜ Pending |
| 11 — Chat DataChannel | ⬜ Pending |
| 12 — File Transfer | ⬜ Pending |
| 13 — Polish | ⬜ Pending |

---

## Key invariants (enforced by lint + tsconfig)

| Rule | Why |
|---|---|
| Feature folders export only through `index.ts` | Changing internals never breaks callers |
| All Tauri events go through `TauriEvents` map | Adding an event = one line, no other files change |
| All `invoke()` calls go through `tauriCommands` | Typed, discoverable, easy to mock in tests |
| `ControlMessage` is a discriminated union | New protocol message = one variant, compiler catches unhandled cases |
| `packages/core` imports nothing from Tauri/React | Core logic is testable and reusable independently |
| Files stay focused (one concern per file) | Avoids the need to load large context to make a small change |
