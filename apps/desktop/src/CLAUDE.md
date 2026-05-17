# Frontend — quick reference

## Directory layout

```
src/
  App.tsx                     layout root; wires Tauri events → stores
  tauri/
    commands.ts               ALL invoke() calls live here — never raw invoke elsewhere
    events.ts                 TauriEvents interface + useTauriEvent hook
  features/
    peers/    usePeerStore     Zustand: peer list, active peer, unread counts
    calls/    useCallStore     Zustand: call state (incoming, active, remote stream)
              peerConnectionManager.ts  WebRTC lifecycle (see its own CLAUDE.md)
              usePeerConnections.ts     React hook — wires signaling-message-received → pcm
    chats/    useChatStore     messages per peer, SQLite persistence
    files/    useFileStore     transfer rows, progress
    settings/ useSettingsStore local peer identity (id, name, ip, port) + theme/devices
  shared/                     Avatar, Button, Toast — used across features
  lib/peers.ts                initialsFromName, colorFromId helpers
```

## Key event flows

### Peer discovery (Rust → frontend)
1. Rust mDNS browser resolves a peer → emits `peer-discovered` Tauri event.
2. `App.tsx` `handlePeerDiscovered` → `usePeerStore.addPeer` (upsert — safe to call multiple times for same peer).
3. Self-discovery is filtered in Rust; no frontend filter needed.
4. `peer-lost` → `usePeerStore.removePeer` (suppressed in Rust for 3 s after a re-resolve).

### Signaling / WebRTC (frontend → Rust → peer → Rust → frontend)
See `features/calls/CLAUDE.md` for the full WebRTC flow.
Short version: `peerConnectionManager` drives everything; `usePeerConnections` bridges Tauri events to it.

## Zustand store rules
- `usePeerStore.addPeer` is an **upsert** — re-advertising a peer updates it in place.
- Never import one feature's store from another feature's component; go through the feature's `index.ts`.
- `useSettingsStore.local.id` holds the local peer UUID (loaded asynchronously by `init()`).
  Do not read it before `init()` resolves — use the Rust-side `local_peer_id` filter for self-exclusion instead.
