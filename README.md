# NetLink

**LAN-only P2P video/audio calls, chat, and file sharing for macOS, Windows, and Linux.**

No internet. No servers. No cloud. Everything stays on your local network.

![NetLink UI — Chats view](docs/screenshots/chats.png)

---

## Features

| Feature | Description |
|---|---|
| **LAN peer discovery** | Automatic via mDNS (`_p2pchat._tcp.local`). Peers appear instantly, no config needed. |
| **Video & audio calls** | Direct WebRTC P2P using host-only ICE candidates — your router never touches the media. |
| **Text chat** | Ordered, reliable WebRTC DataChannel. Messages persist to local SQLite. |
| **File transfer** | Chunked (64 KB), resumable, SHA-256 verified. Supports files of any size via streaming. |
| **Offline-first** | Works on air-gapped networks, no STUN/TURN servers required. |

---

## Stack

| Layer | Technology |
|---|---|
| Desktop shell | [Tauri v2](https://tauri.app/) (Rust) |
| Frontend | React 18 + TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Build | Vite |
| WebRTC | [simple-peer](https://github.com/feross/simple-peer) |
| LAN discovery | multicast-dns (mDNS, Tauri sidecar) |
| Signaling | Local WebSocket server (Rust `tokio-tungstenite`) |
| Database | SQLite via `tauri-plugin-sql` |

---

## Monorepo Structure

```
NetLink/
├── apps/
│   └── desktop/
│       ├── src/
│       │   ├── features/           ← one folder per feature; each is self-contained
│       │   │   ├── peers/          ← PeerList, PeerRow, usePeerStore, types
│       │   │   ├── calls/          ← CallsView, ActiveCall, VideoSurface, useCallStore, types
│       │   │   ├── chats/          ← ChatsView, MessageBubble, ChatInput, useChatStore, types
│       │   │   ├── files/          ← FilesView, TransferRow, useFileStore, types
│       │   │   └── settings/       ← SettingsModal, useSettingsStore, types
│       │   ├── shared/
│       │   │   ├── components/     ← Avatar, Button, Toast (reused across features)
│       │   │   └── icons/          ← single icon set, no third-party icon lib
│       │   ├── tauri/
│       │   │   ├── commands.ts     ← typed invoke() wrappers — one place to add commands
│       │   │   └── events.ts       ← TauriEvents map — one line to add a new event
│       │   ├── App.tsx             ← layout wiring only, < 80 lines
│       │   └── main.tsx
│       └── src-tauri/
│           ├── src/
│           │   ├── main.rs
│           │   ├── mdns.rs         ← mDNS advertising + browser task
│           │   ├── signaling.rs    ← WebSocket signaling server
│           │   └── commands.rs     ← all #[tauri::command] functions
│           └── Cargo.toml
├── packages/
│   ├── core/                       ← pure TypeScript, zero Tauri/React imports
│   │   └── src/
│   │       ├── PeerConnection.ts
│   │       ├── FileTransferManager.ts
│   │       ├── protocol.ts         ← ControlMessage union — one line per message type
│   │       └── types.ts            ← Peer, Message, Transfer shared types
│   └── ui/                         ← shared React + Tailwind primitives only
│       └── src/
│           ├── Button.tsx
│           ├── Avatar.tsx
│           └── index.ts
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── PLAN.md
├── STACK.md
└── README.md
```

### Design principle: feature folders

Every feature lives in one folder. Adding a new feature (e.g. screen annotations, reactions) means **creating a new folder** — not editing shared files. Each feature folder exports a minimal public API (`index.ts`); other features import from that API, never from internal files.

```
features/calls/
  index.ts          ← public API: exports CallsView, useCallStore
  CallsView.tsx     ← top-level view component
  ActiveCall.tsx    ← in-call layout
  VideoSurface.tsx  ← video placeholder / stream mount
  CallControls.tsx  ← mute / end / screen-share bar
  useCallStore.ts   ← Zustand slice (state + actions for this feature only)
  types.ts          ← Call, CallState — types used only within this feature
```

---

## Getting Started

### Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [Node.js](https://nodejs.org/) ≥ 20
- [pnpm](https://pnpm.io/) ≥ 9
- Tauri CLI: `cargo install tauri-cli`

### Install

```bash
pnpm install
```

### Develop

```bash
pnpm dev          # starts Tauri dev server (hot reload)
```

### Build

```bash
pnpm build        # builds all packages then Tauri app
```

---

## Architecture

### LAN Discovery (mDNS)

Each peer broadcasts `_p2pchat._tcp.local` with a UUID and display name. The Rust backend runs the mDNS browser and emits Tauri events to the frontend:

```
"peer-discovered"  { id, name, address, port }
"peer-lost"        { id }
```

### Signaling (WebSocket over LAN)

No signaling server on the internet. Each peer runs a tiny WebSocket server in Rust (via `tokio-tungstenite`) on a random port, advertised in the mDNS TXT record. When you call a peer:

1. Frontend tells Tauri to connect to the peer's WebSocket address
2. SDP offer/answer and ICE candidates are exchanged
3. WebRTC goes fully direct P2P — even on Wi-Fi

ICE configuration: host-only candidates, no STUN/TURN needed on a LAN.

### File Transfer Protocol

| Channel | Label | Mode | Purpose |
|---|---|---|---|
| DataChannel 1 | `chat` | ordered + reliable | Text messages |
| DataChannel 2 | `file-transfer` | unordered + reliable | Binary chunk payloads |
| DataChannel 3 | `control` | ordered + reliable | Transfer coordination |

Control messages:

```json
FILE_OFFER    { transferId, name, size, totalChunks, chunkSize, sha256 }
FILE_ACCEPT   { transferId }
FILE_DECLINE  { transferId }
FILE_NACK     { transferId, chunkIndex }
FILE_COMPLETE { transferId }
FILE_CANCEL   { transferId }
```

- **Chunk size**: 64 KB
- **Sliding window**: 8 chunks in flight
- **Backpressure**: pause at 8 MB buffered, resume at 2 MB
- **Integrity**: SHA-256 of complete received file
- **Resume**: chunk bitmap persisted to SQLite; on reconnect, sender skips already-received chunks

---

## Zustand Stores

| Store | State |
|---|---|
| `usePeerStore` | Discovered peers map, connection states |
| `useCallStore` | Active call state (peerId, duration, muted, videoOff) |
| `useChatStore` | Messages per peer, unread counts |
| `useFileStore` | Active and completed transfers |
| `useSettingsStore` | localId, displayName, selected camera/mic |

---

## Design System

Dark mode by default, system preference respected. Colors use OKLCH for perceptual uniformity.

| Token | Value | Usage |
|---|---|---|
| `--bg` | `oklch(0.165 0.012 250)` | App background |
| `--surface` | `oklch(0.225 0.012 250)` | Cards, panels |
| `--accent` | `oklch(0.82 0.16 165)` | Online status, active, primary actions |
| `--warn` | `oklch(0.82 0.13 75)` | In-call status, warnings |
| `--danger` | `oklch(0.68 0.19 25)` | End call, destructive actions |
| `--mono` | JetBrains Mono | IPs, hashes, tech metadata, counters |
| `--sans` | Inter | All other UI text |

---

## Constraints

- **No internet** — LAN only, no STUN/TURN, no signaling server
- **Desktop only** — macOS, Windows, Linux via Tauri; no mobile
- **File I/O through Tauri** — `tauri-plugin-fs`, `tauri-plugin-dialog`; never browser File API for saving
- **`packages/core` is pure TypeScript** — no Tauri or React imports
- **Strict TypeScript** — `"strict": true`, no `any`

---

## License

MIT — see [LICENSE](LICENSE)
