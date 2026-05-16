# NetLink — Tech Stack

## Overview

NetLink is a **monorepo** built with pnpm workspaces, containing a Tauri v2 desktop app and two shared TypeScript packages.

```
apps/desktop     ← Tauri v2 app (Rust backend + React frontend)
packages/core    ← Framework-agnostic TS: WebRTC logic, file chunking
packages/ui      ← Shared React + Tailwind components
```

---

## Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 18 | UI rendering |
| TypeScript | 5.x (strict) | Type safety across entire codebase |
| Vite | 5.x | Dev server and bundler |
| Tailwind CSS | 4.x | Utility-first styling |
| Zustand | 5.x | Lightweight client state management |

### Why Zustand over Redux/Jotai?
- Minimal boilerplate for 5 clearly-scoped stores
- Works well with Tauri event listeners (easy to call store actions from event handlers)
- No context providers needed

---

## Desktop Shell

| Technology | Version | Purpose |
|---|---|---|
| Tauri | v2 | Cross-platform desktop shell (Rust core) |
| Rust | stable | Backend, mDNS, WebSocket signaling server |
| tokio | 1.x | Async runtime for background tasks |
| tokio-tungstenite | 0.x | WebSocket server for signaling |
| tauri-plugin-store | v2 | Persist peer UUID and display name |
| tauri-plugin-sql | v2 | SQLite for chat history + file chunk bitmaps |
| tauri-plugin-fs | v2 | Write received files to disk |
| tauri-plugin-dialog | v2 | Native file picker for sending files |

### Why Tauri over Electron?
- **Bundle size**: Tauri ~10 MB vs Electron ~100+ MB
- **Memory**: Tauri uses the OS webview (WKWebView / WebView2 / WebKitGTK), not a bundled Chromium
- **Security**: Rust backend with explicit command allowlisting; no Node.js in the renderer
- **Native**: Better integration with macOS/Windows system APIs

---

## WebRTC & Networking

| Technology | Purpose |
|---|---|
| `simple-peer` | Wraps the browser WebRTC API. Runs in the Tauri webview (which supports WebRTC natively). |
| `multicast-dns` | mDNS advertising + discovery. Runs as a Tauri sidecar (Node.js process) or native Rust via `mdns-sd`. |
| `tokio-tungstenite` | Local-only WebSocket signaling server in Rust. No internet exposure. |

### ICE Configuration
```json
{
  "iceServers": [],
  "iceTransportPolicy": "all"
}
```
Host-only candidates. On a LAN, peers are always reachable via their LAN IP — no STUN needed.

### DataChannels
| Label | Mode | Usage |
|---|---|---|
| `chat` | ordered + reliable | Text messages |
| `file-transfer` | unordered + reliable | Binary chunk payloads |
| `control` | ordered + reliable | FILE_OFFER / FILE_ACCEPT / FILE_NACK coordination |

---

## Database

SQLite via `tauri-plugin-sql`. Stored in the app's data directory (platform-specific).

### Schema

```sql
CREATE TABLE messages (
  id          TEXT PRIMARY KEY,
  peer_id     TEXT NOT NULL,
  sender_id   TEXT NOT NULL,
  text        TEXT NOT NULL,
  timestamp   INTEGER NOT NULL,
  state       TEXT NOT NULL DEFAULT 'sent'
);

CREATE TABLE transfers (
  id            TEXT PRIMARY KEY,
  peer_id       TEXT NOT NULL,
  name          TEXT NOT NULL,
  size          INTEGER NOT NULL,
  direction     TEXT NOT NULL,  -- 'in' | 'out'
  state         TEXT NOT NULL,  -- 'offered' | 'transferring' | 'complete' | 'failed'
  chunk_bitmap  BLOB,           -- received chunk bitmap for resume
  sha256        TEXT,
  created_at    INTEGER NOT NULL
);
```

---

## Packages

### `packages/core`

Pure TypeScript. **Zero Tauri or React imports.**

| Export | Description |
|---|---|
| `PeerConnection` | Wraps `simple-peer`. Opens all 3 DataChannels on connection. Exposes `call()`, `hangup()`, `sendMessage()`, `sendFileOffer()`. |
| `FileTransferManager` | Manages concurrent transfers. Handles 64KB chunking, backpressure, 8-frame sliding window, NACK, resume. Emits `progress` events. |
| `MessageStore` | Abstract interface. Implemented by the Tauri app with `tauri-plugin-sql`. |
| `types.ts` | Shared TypeScript types: `Peer`, `Message`, `Transfer`, `ControlMessage`, etc. |

### `packages/ui`

React + Tailwind. Depends on `packages/core` types but not the Tauri APIs.

| Component | Description |
|---|---|
| `PeerList` | Discovered peers with connection status and call button |
| `VideoCall` | Fullscreen call view with PiP local preview |
| `ChatPanel` | Message thread + input |
| `FilePanel` | Transfer list + send button |
| `TransferItem` | Individual transfer with progress bar |
| `SettingsModal` | Identity / Devices / Network / Storage / Appearance |

---

## Build & Tooling

| Tool | Purpose |
|---|---|
| `pnpm` | Package manager + workspace orchestration |
| `turbo` (optional) | Build caching across packages |
| `eslint` | Linting (TypeScript rules) |
| `prettier` | Code formatting |
| `vitest` | Unit tests for `packages/core` |
| `cargo test` | Rust unit tests |

---

## Why This Stack?

The design brief calls for:
- **LAN-only, no cloud** → Tauri + Rust (no Node.js HTTP servers exposed, no Electron cloud hooks)
- **WebRTC** → `simple-peer` runs in the Tauri webview's JS context without modification
- **Cross-platform desktop** → Tauri v2 supports macOS / Windows / Linux from one codebase
- **Small, fast builds** → pnpm workspaces + Vite = fast HMR; Tauri = small binary
- **Type safety** → TypeScript strict mode everywhere, including the protocol types shared between frontend and Rust via Tauri commands

---

## Versions Summary

```json
{
  "react": "^18.3.1",
  "typescript": "^5.5",
  "vite": "^5.4",
  "tailwindcss": "^4.0",
  "zustand": "^5.0",
  "simple-peer": "^9.11",
  "@tauri-apps/api": "^2.0",
  "@tauri-apps/plugin-store": "^2.0",
  "@tauri-apps/plugin-sql": "^2.0",
  "@tauri-apps/plugin-fs": "^2.0",
  "@tauri-apps/plugin-dialog": "^2.0"
}
```

```toml
# Cargo.toml (key deps)
tauri = { version = "2", features = ["protocol-asset"] }
tokio = { version = "1", features = ["full"] }
tokio-tungstenite = "0.24"
mdns-sd = "0.10"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
uuid = { version = "1", features = ["v4"] }
```
