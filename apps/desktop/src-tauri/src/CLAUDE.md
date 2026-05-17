# Rust backend — quick reference

## Files

| File | Purpose |
|---|---|
| `lib.rs` | App entry point: loads identity, creates state, spawns tasks |
| `signaling.rs` | WebSocket signaling server + outbound client connections |
| `mdns.rs` | mDNS advertising + browsing (peer discovery) |
| `commands.rs` | All `#[tauri::command]` functions — only entry points for JS→Rust |

## State (`SignalingInner` in `signaling.rs`)

Single `Arc<Mutex<SignalingInner>>` managed by Tauri. Fields:
- `peer_id` — stable UUID, persisted in `settings.json`
- `display_name` — user-chosen name
- `hostname / ip / port` — network identity; `port` is set by `init_server`
- `connections` — `HashMap<peer_id, UnboundedSender>` for active outbound WS channels
- `mdns_daemon` — the ONE shared `ServiceDaemon` (see mDNS section)

## mDNS — critical design rule

**One `ServiceDaemon`, shared between advertising and browsing.**

Creating two separate daemons on the same host causes OS-level multicast ambiguity: incoming packets on port 5353 are delivered to whichever daemon the kernel picks, so the browser daemon misses responses half the time → asymmetric discovery (A sees B, B doesn't see A).

Fix (implemented): `lib.rs` creates the daemon synchronously in `setup`, stores it in `state.mdns_daemon`, and both `start_advertising` and `start_browser` obtain it from there.

Self-discovery is suppressed: `start_browser` receives `local_peer_id` and skips any resolved service whose `peer_id` TXT record matches.

Restart race suppressed: `ServiceRemoved` events within 3 s of a `ServiceResolved` for the same peer are dropped (peer restarts send a goodbye for the old registration after re-advertising).

## Signaling — message envelope

**All outbound messages must be wrapped in the envelope `handle_incoming` expects.**

`handle_incoming` (server-side) deserialises:
```json
{ "from_peer_id": "<sender UUID>", "payload": "<raw string>" }
```

`send_message` in `signaling.rs` performs this wrapping automatically using `serde_json::json!`. Never send a raw payload through `tx.send()` directly — it will be silently dropped on the receiver.

## Signaling flow (A→B)

1. A discovers B via mDNS (gets B's IP + port).
2. Frontend calls `connect_to_signaling(ws://B.ip:B.port, B.peer_id)`.
3. Rust `connect_to_peer`: opens WS to B's server, stores `tx` in `connections[B.peer_id]`.
4. Frontend calls `send_signaling_message(B.peer_id, payload)`.
5. Rust `send_message`: wraps payload in envelope, sends through `tx` → outbound relay → WS.
6. B's `handle_incoming` deserialises envelope, emits `signaling-message-received` on B.
7. B's frontend handles the signal (WebRTC SDP/ICE), calls `connect_to_signaling(A.ip:A.port)` back.
8. Reverse direction (B→A) follows the same path through A's `handle_incoming`.

The inbound relay in `connect_to_peer` receives any messages the *server* writes back on the same WS socket. Currently `handle_incoming` is read-only, so this relay is idle — it exists for future bidirectional server use.
