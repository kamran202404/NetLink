# NetLink — Implementation Plan

> Implementation order is sequential. Each phase must pass its own acceptance criteria before moving to the next.
>
> Before writing any feature code, read [STACK.md](STACK.md) — specifically the **Code Organization Principles** section. The rules there (feature folders, file size budget, typed boundaries) are enforced throughout.

---

## What is already built (UI shell — complete)

The following phases from the original plan are **done**: design system, app shell, sidebar, chats view, calls view, files view, settings modal, incoming call modal. The UI correctly mirrors the design reference.

**The problem:** every store is seeded with hardcoded mock data and nothing talks to the Rust backend. The backend itself is also partially broken (SignalingState is never registered, signaling server never starts, mDNS advertising never starts). The phases below fix this, in dependency order.

---

## Phase A — Backend Bootstrap

**Goal:** The Rust backend actually starts, registers state, and is reachable from the frontend. This is a prerequisite for every phase below — nothing real can work until this is fixed.

### Root causes to fix

- `SignalingInner::new()` is defined but never called; `SignalingState` is never passed to `.manage()` in `lib.rs` — all backend commands crash at runtime
- `start_server()` is never called — the signaling server never binds a port
- mDNS advertising (`start_advertising`) is never called — this machine is invisible to peers
- `ip` in `SignalingInner::new()` is hardcoded to `"127.0.0.1"` — unusable on LAN

### Tasks

- [x] **Fix Rust warnings** — `signaling.rs`: refactored into `init_server` + `run_server`; `handle_incoming` prefixes unused params; zero warnings
- [x] **`lib.rs` wiring** — creates `SignalingState` in setup, calls `.manage()`, spawns signaling server then mDNS advertising then mDNS browser
- [x] **Real IP detection** — `local-ip-address` crate picks first non-loopback IPv4; hostname via env + `/etc/hostname` + `hostname` command
- [x] **Persist identity** — `tauri-plugin-store` saves/loads `peer_id` and `display_name` from `settings.json`; peer_id generated once and never regenerated

### Acceptance

- `cargo build` produces zero warnings
- `get_local_peer_info` returns a real UUID, real LAN IP, real port (not 0, not 127.0.0.1)
- Two machines on the same LAN: both appear in each other's mDNS browser logs within 3 s

---

## Phase B — Real Identity

**Goal:** The app reads its own identity from the backend instead of hardcoded mock values. Depends on Phase A.

### Tasks

- [x] **`useSettingsStore`** — `init()` fetches from `getLocalPeerInfo()`; replaces hardcoded mock; called from `App.tsx` on mount
- [x] **LAN pill** — displays real IP from settings store (shows `…` until backend responds)
- [x] **Me-card** in sidebar — shows real display name, real hostname, real IP
- [x] **Settings > Identity tab** — display name input calls `tauriCommands.setDisplayName(name)`; peer ID shown from store
- [x] **Initials + color derivation** — `initialsFromName` + `colorFromId` in `src/lib/peers.ts`; used by settings store and (Phase C) peer store

### Acceptance

- App shows your real machine name and LAN IP on first launch
- Changing display name in Settings persists after app restart

---

## Phase C — Real Peer Discovery

**Goal:** The peer list shows actual machines on the LAN, not mock data. Depends on Phases A and B.

### Tasks

- [x] **`usePeerStore`** — mock peers removed; starts empty; `activePeerId: string | null`; auto-selects first discovered peer; `removePeer` falls back to next peer or null
- [x] **Wire events in `App.tsx`** — `useTauriEvent('peer-discovered')` builds a `Peer` with `initialsFromName` + `colorFromId` and calls `addPeer`; `peer-lost` calls `removePeer`
- [x] **Empty state** — sidebar shows pulsing dot + "Scanning for peers…" hint when no peers and no search query
- [x] **`activePeerId` guard** — `activePeer` is `Peer | null`; ChatsView guarded with "Select a peer" placeholder; embedded chat panel also guarded; `showChatPanel` requires non-null peer
- [x] **`mdns.rs`** — `PeerDiscoveredPayload` includes `hostname`; `peer-lost` correctly emits `peer_id` via HashMap (not raw fullname); hostname trailing dot trimmed
- [x] **`Peer.os` and `LocalPeer.os`** — made optional since mDNS/backend don't advertise OS

### Acceptance

- Launching the app on two LAN machines: each shows the other in the sidebar within 5 s
- Closing one machine: its entry disappears from the other's list
- Sidebar shows "No peers found" when running alone

---

## Phase D — WebRTC Signaling & Calls

**Goal:** Real 1-to-1 video/audio calls between two machines. Depends on Phase C (need real peers to call).

### Tasks

- [x] **`peerConnectionManager.ts`** — singleton in `src/features/calls/`; wraps `simple-peer`; callback surface (`setCallbacks`) avoids circular dep with `useCallStore`; `pendingSignals` map queues trickle-ICE before `acceptCall`; `hangup` deletes from map before `destroy()` to prevent re-entrant `endCall`
- [x] **`usePeerConnections` hook** — registers manager callbacks once on mount; bridges `signaling-message-received` Tauri event → `pcm.handleIncomingSignal`
- [x] **Media** — `getUserMedia` in `startCall`/`acceptCall`; `localStream` stored in call store; `toggleMute`/`toggleVideo` enable/disable actual tracks
- [x] **Remote stream** — `onRemoteStream` callback → `callStore.setRemoteStream`; `CallsView` VideoSurface binds `srcObject` via `useRef`+`useEffect`
- [x] **`useCallStore` wiring** — `startCall`, `acceptCall`, `rejectCall`, `endCall` (guarded against double-call); `localStream`/`remoteStream`/`incomingCallPeerId` state
- [x] **Incoming call** — `handleIncomingSignal` queues signals + calls `onIncomingCall` → `IncomingCallModal` shown; accept → `acceptCall` feeds queued signals

### Acceptance

- Two machines can video call with no dropped frames on LAN
- Mute/unmute and video on/off actually affect the media
- Ending call on either side tears down both sides

---

## Phase E — Real Chat

**Goal:** Messages sent via WebRTC DataChannel, persisted to SQLite. Depends on Phase D (DataChannel requires an active `PeerConnection`).

### Tasks

- [x] **`ControlMessage` extended** — added `CHAT_DELIVERED` and `CHAT_READ` variants to `packages/core/src/protocol.ts`
- [x] **Channel multiplexing** — all DataChannel traffic framed as `{ ch: 'chat'|'control'|'file-data', payload }` over the single SimplePeer channel; `onChannelData(ch, handler)` and `sendData(peerId, ch, payload)` exported from `calls/index.ts`
- [x] **Signaling envelope** — `{ connType: 'call'|'data', signal }` wrapper added to all signaling messages; receiver auto-accepts `data` connections without showing the call modal; `pendingDataSignals` map handles trickle-ICE race for auto-accepts
- [x] **`connectForData(peerId)`** — establishes a data-only WebRTC connection (no media) for out-of-call chat; idempotent; exported from `calls/index.ts`
- [x] **Outbound message queue** — `pendingOutbound` map in `peerConnectionManager` buffers `sendData` calls until `'connect'` fires; flushed on DataChannel open
- [x] **`useChatStore`** — mock messages removed; `init()` registers channel handlers + `initDb()`; `sendMessage` calls `connectForData` then `sendData`; `markDelivered`/`markRead` handlers update store + SQLite
- [x] **SQLite persistence** — `src/tauri/db.ts` wraps `@tauri-apps/plugin-sql`; `saveMessage`, `loadMessages`, `updateMessageState`; `App.tsx` loads history on peer select
- [x] **Read acks** — `markRead(peerId)` sends `CHAT_READ` for all unread received messages, resets `peer.unread` to 0; called from `App.tsx` when `activePeerId` changes

### Acceptance

- Messages appear on both machines in real time
- Sent → delivered → read progression uses real acks, not timeouts
- History persists after app restart

---

## Phase F — Real File Transfer

**Goal:** Chunked file transfer via DataChannel with integrity check. Depends on Phase D.

### Tasks

- [ ] **`FileTransferManager` — `packages/core/src/FileTransferManager.ts`**:
  - Sender: `start(file: ArrayBuffer, meta)` → split into 64 KB chunks → send via `"file-data"` DataChannel with backpressure (`bufferedAmountLowThreshold`)
  - Implements sliding window (8 chunks in-flight max)
  - Handles `FILE_NACK` by resending the specific chunk
  - Emits `progress(fraction, speed, eta)` events
- [ ] **`useFileStore`** — remove `MOCK_TRANSFERS`; start with `transfers: []`
- [ ] **Offer flow** — file picker via `tauriCommands.openFilePicker()` → compute SHA-256 (Web Crypto) → send `FILE_OFFER` control message → add to store as `offered`
- [ ] **Accept flow** — receive `FILE_OFFER` → add to store as `offered`; user clicks Accept → send `FILE_ACCEPT` → `FileTransferManager` starts sending
- [ ] **Reassembly** — receiver collects chunks → when `FILE_COMPLETE` received, verify SHA-256 → write to downloads folder via Tauri fs plugin
- [ ] **Resume** — persist chunk bitmap to SQLite; on reconnect, resume from last confirmed chunk
- [ ] **Add `open_file_picker` Tauri command** — uses `tauri-plugin-dialog` to open native file picker, returns path + size + name

### Acceptance

- Sending a file to another machine: progress bar advances in real time on both sides
- SHA-256 verified badge appears on completion
- Partial transfer survives app restart on both sides

---

## Phase G — Settings Persistence

**Goal:** Settings survive restarts. Can be worked on in parallel with Phases D/E/F after Phase B is done.

### Tasks

- [ ] **`tauri-plugin-store`** — persist `peer_id`, `display_name`, `theme`, `download_folder` to a `settings.json` store file
- [ ] **Settings > Network tab** — show real signaling port (read from `getLocalPeerInfo`)
- [ ] **Settings > Devices tab** — enumerate cameras/mics via `navigator.mediaDevices.enumerateDevices()`; selection persisted to store and used when starting calls
- [ ] **Settings > Storage tab** — download folder picker via `tauri-plugin-dialog`; clear chat history deletes SQLite rows

### Acceptance

- Display name set in Settings persists after restart
- Selected camera/mic is used when a call starts

---

## Phase H — Polish & Error Handling

**Goal:** Every error surface is handled; app is shippable. Depends on all previous phases.

### Tasks

- [ ] Camera/mic permission denied → toast with per-OS instructions
- [ ] Peer unreachable (signaling connect fails) → toast + retry button with exponential backoff
- [ ] File hash mismatch on completion → dialog offering re-request
- [ ] DataChannel close mid-transfer → pause + auto-resume on reconnect
- [ ] All `tauriCommands.*` rejections → `useToast` error toast
- [ ] Light mode pass (theme token tuning)
- [ ] Minimum window size enforcement (800×600) in `tauri.conf.json`
- [ ] App icon

---

## Dependency graph

```
A (Backend Bootstrap)
└── B (Real Identity)
    └── C (Peer Discovery)
        └── D (WebRTC / Calls)
            ├── E (Real Chat)
            └── F (Real File Transfer)
        (parallel with D/E/F)
        └── G (Settings Persistence)
            └── H (Polish)
```

**Critical path:** A → B → C → D → E → H

---

## Current Status

| Phase | Status |
|---|---|
| UI Shell (Phases 0–8 from original plan) | ✅ Complete (mock data) |
| A — Backend Bootstrap | ✅ Complete |
| B — Real Identity | ✅ Complete |
| C — Real Peer Discovery | ✅ Complete |
| D — WebRTC & Calls | ✅ Complete |
| E — Real Chat | ✅ Complete |
| F — Real File Transfer | ⬜ Pending |
| G — Settings Persistence | ⬜ Pending |
| H — Polish | ⬜ Pending |

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
