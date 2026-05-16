# NetLink — Tech Stack & Code Organization

## Technology Choices

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 18 | UI rendering |
| TypeScript | 5.x (strict) | Type safety across entire codebase |
| Vite | 5.x | Dev server and bundler |
| Tailwind CSS | 4.x | Utility-first styling |
| Zustand | 5.x | Lightweight per-feature state slices |

### Desktop Shell

| Technology | Version | Purpose |
|---|---|---|
| Tauri | v2 | Cross-platform desktop shell |
| Rust (stable) | — | Backend, mDNS, WebSocket signaling |
| tokio | 1.x | Async runtime |
| tokio-tungstenite | 0.24 | WebSocket signaling server |
| tauri-plugin-store | v2 | Persist peer UUID + display name |
| tauri-plugin-sql | v2 | SQLite: chat history + file chunk bitmaps |
| tauri-plugin-fs | v2 | Write received files to disk |
| tauri-plugin-dialog | v2 | Native file picker |

### Networking

| Technology | Purpose |
|---|---|
| `simple-peer` | WebRTC abstraction, runs in Tauri webview |
| `mdns-sd` (Rust) | mDNS advertising + discovery in the Rust backend |
| `tokio-tungstenite` | LAN-only WebSocket signaling (no internet exposure) |

**ICE config** — host-only, no STUN/TURN:
```json
{ "iceServers": [], "iceTransportPolicy": "all" }
```

---

## Code Organization Principles

These rules keep the codebase maintainable as it grows and minimize the context needed to make any single change.

### 1. Feature folders — the primary unit of organization

All code for a feature lives in one folder. The folder owns its component, its Zustand slice, and its types. Nothing leaks out except through `index.ts`.

```
src/features/
  peers/        → PeerList.tsx, PeerRow.tsx, usePeerStore.ts, types.ts, index.ts
  calls/        → CallsView.tsx, ActiveCall.tsx, VideoSurface.tsx, CallControls.tsx, useCallStore.ts, types.ts, index.ts
  chats/        → ChatsView.tsx, MessageBubble.tsx, ChatInput.tsx, useChatStore.ts, types.ts, index.ts
  files/        → FilesView.tsx, TransferRow.tsx, useFileStore.ts, types.ts, index.ts
  settings/     → SettingsModal.tsx, useSettingsStore.ts, types.ts, index.ts
```

**Adding a new feature** = create a new folder. No existing files change.

**Cross-feature imports** must go through `index.ts`, never into internal files:
```ts
// ✅ correct
import { useCallStore } from '@/features/calls';
// ❌ wrong — bypasses the public API
import { useCallStore } from '@/features/calls/useCallStore';
```

### 2. Keep files focused, not artificially small

Prefer files that do one thing well. Most files will naturally land under 300 lines; complex views or managers may grow larger — that's fine if the file is still coherent. The signal to split is **mixed concerns**, not line count.

| Situation | Action |
|---|---|
| A component file also contains unrelated helpers | Extract helpers |
| A store file manages two unrelated slices of state | Split into two stores |
| A `types.ts` has types from multiple domains | Split by domain |
| A 600-line file is one cohesive class | Leave it alone |

The practical guideline: if you have to scroll past a full screen to find what you're looking for, it probably needs splitting. Under ~500 lines is a good target; over ~800 is a smell worth investigating.

### 3. Typed Tauri event map — one file to extend

All Rust → frontend events are declared in a single type map. Adding a new event requires touching exactly one line in one file.

```ts
// src/tauri/events.ts
export interface TauriEvents {
  'peer-discovered':             { id: string; name: string; address: string; port: number };
  'peer-lost':                   { id: string };
  'signaling-message-received':  { fromPeerId: string; payload: string };
  // ← add new events here
}

// Generic typed hook — no changes needed when new events are added
export function useTauriEvent<K extends keyof TauriEvents>(
  event: K,
  handler: (payload: TauriEvents[K]) => void,
): void
```

### 4. Typed Tauri command wrappers — one file to extend

All `invoke()` calls are wrapped in one file with full types. No raw `invoke<any>` scattered across the codebase.

```ts
// src/tauri/commands.ts
export const tauriCommands = {
  getLocalPeerInfo: ()               => invoke<{ id: string; name: string }>('get_local_peer_info'),
  setDisplayName:   (name: string)   => invoke<void>('set_display_name', { name }),
  startMdns:        (port: number)   => invoke<void>('start_mdns_advertising', { port }),
  stopMdns:         ()               => invoke<void>('stop_mdns'),
  getSignalingAddr: ()               => invoke<string>('get_local_signaling_address'),
  // ← add new commands here
};
```

Adding a new Tauri command = one line here + one `#[tauri::command]` in Rust. Nothing else changes.

### 5. Protocol message union — one type to extend

All DataChannel control messages are a discriminated union in `packages/core`. TypeScript exhaustiveness checking catches unhandled message types at compile time.

```ts
// packages/core/src/protocol.ts
export type ControlMessage =
  | { type: 'FILE_OFFER';    transferId: string; name: string; size: number; totalChunks: number; chunkSize: number; sha256: string }
  | { type: 'FILE_ACCEPT';   transferId: string }
  | { type: 'FILE_DECLINE';  transferId: string }
  | { type: 'FILE_NACK';     transferId: string; chunkIndex: number }
  | { type: 'FILE_COMPLETE'; transferId: string }
  | { type: 'FILE_CANCEL';   transferId: string }
  // ← add new message types here

// Exhaustiveness: TypeScript will error if a switch doesn't handle all cases
function handleControl(msg: ControlMessage) {
  switch (msg.type) {
    case 'FILE_OFFER':    return handleOffer(msg);
    case 'FILE_ACCEPT':   return handleAccept(msg);
    // ... all cases must be covered
    default: msg satisfies never; // compile error if a new type is unhandled
  }
}
```

### 6. Zustand slices — no cross-slice imports

Each feature owns exactly one Zustand slice. Slices do not import from each other. If two features need to communicate, they use Tauri events or a narrow shared hook.

```ts
// features/calls/useCallStore.ts
interface CallState {
  inCall: string | null;
  muted: boolean;
  videoOff: boolean;
  screenshare: boolean;
  duration: number;
}

interface CallActions {
  startCall: (peerId: string) => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
}

export const useCallStore = create<CallState & CallActions>()(...)
```

### 7. `packages/core` has zero framework imports

`packages/core` must never import from Tauri, React, or the browser `File` API. This means:
- It can be unit-tested with `vitest` without any mocking of Tauri
- It can be reused in a CLI tool, a test harness, or a future mobile port
- It expresses the protocol logic cleanly without UI or platform concerns

### 8. `App.tsx` is layout glue only

`App.tsx` wires the three-column layout and delegates everything else to feature components. It should stay under 80 lines. No business logic lives here.

---

## Dependency Pinning

```json
{
  "react":                      "^18.3.1",
  "typescript":                 "^5.5",
  "vite":                       "^5.4",
  "tailwindcss":                "^4.0",
  "zustand":                    "^5.0",
  "simple-peer":                "^9.11",
  "@tauri-apps/api":            "^2.0",
  "@tauri-apps/plugin-store":   "^2.0",
  "@tauri-apps/plugin-sql":     "^2.0",
  "@tauri-apps/plugin-fs":      "^2.0",
  "@tauri-apps/plugin-dialog":  "^2.0"
}
```

```toml
# Cargo.toml
tauri           = { version = "2", features = ["protocol-asset"] }
tokio           = { version = "1", features = ["full"] }
tokio-tungstenite = "0.24"
mdns-sd         = "0.10"
serde           = { version = "1", features = ["derive"] }
serde_json      = "1"
uuid            = { version = "1", features = ["v4"] }
```

---

## SQLite Schema

```sql
CREATE TABLE messages (
  id          TEXT PRIMARY KEY,
  peer_id     TEXT NOT NULL,
  sender_id   TEXT NOT NULL,
  text        TEXT NOT NULL,
  timestamp   INTEGER NOT NULL,
  state       TEXT NOT NULL DEFAULT 'sent'   -- 'sent' | 'delivered' | 'read'
);

CREATE TABLE transfers (
  id            TEXT PRIMARY KEY,
  peer_id       TEXT NOT NULL,
  name          TEXT NOT NULL,
  size          INTEGER NOT NULL,
  direction     TEXT NOT NULL,               -- 'in' | 'out'
  state         TEXT NOT NULL,               -- 'offered' | 'transferring' | 'complete' | 'failed'
  chunk_bitmap  BLOB,                        -- received chunk bitmask for resume
  sha256        TEXT,
  created_at    INTEGER NOT NULL
);
```
