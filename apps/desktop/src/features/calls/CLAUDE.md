# WebRTC & signaling — quick reference

## Files

| File | Purpose |
|---|---|
| `peerConnectionManager.ts` | Singleton managing all SimplePeer instances and signaling |
| `usePeerConnections.ts` | React hook: mounts Tauri `signaling-message-received` → `pcm.handleIncomingSignal` |
| `useCallStore.ts` | Zustand: incomingCallPeerId, activeCallPeerId, remoteStream |

## Signaling envelope (JS side)

Every signal sent over the wire is:
```ts
interface SignalingEnvelope {
  connType: 'call' | 'data';
  signal: SimplePeer.SignalData;   // SDP offer/answer or ICE candidate
}
```
Serialised as `JSON.stringify(envelope)` and passed to `tauriCommands.sendSignalingMessage`.

On the Rust side, `send_message` wraps this in the server envelope:
```json
{ "from_peer_id": "<sender UUID>", "payload": "<serialised SignalingEnvelope>" }
```
`handle_incoming` on the receiver strips the outer envelope and emits `signaling-message-received`
with `{ fromPeerId, payload }` where `payload` is the raw `SignalingEnvelope` JSON.

## Connection lifecycle

### Initiating a data connection (chat / file transfer)
```
connectForData(peerId)
  → connectWithRetry(ws://peer.ip:peer.port, peerId)   // Rust opens WS to peer's server
  → makePeer(initiator=true)                           // SimplePeer generates offer
  → wirePeer(pc, peerId, 'data')
      pc.on('signal') → sendSignalingMessage(peerId, envelope)
```

### Receiving a data connection (auto-accept)
```
signaling-message-received  (from Tauri, triggered by sender's offer arriving at our server)
  → handleIncomingSignal(fromPeerId, rawPayload)
  → connType === 'data' → connectToSignaling(ws://peer.ip:peer.port)
  → makePeer(initiator=false)
  → pc.signal(queued signals)
  → wirePeer → pc.on('signal') → sendSignalingMessage (answer back)
```

### Call flow
Same as data but `connType = 'call'`, uses `localStream`, and shows `IncomingCallModal` instead of auto-accepting.

## Multiplexed data channel

All data (chat, file, control) is multiplexed over ONE DataChannel per peer:
```ts
type ChannelFrame = { ch: 'control' | 'chat' | 'file-data'; payload: unknown };
```
Register handlers with `onChannelData(ch, handler)`.
Send with `sendData(peerId, ch, payload)` — queues if channel not yet open.

## Pending signal maps

| Map | Purpose |
|---|---|
| `pendingSignals` | ICE candidates arriving while IncomingCallModal is showing |
| `pendingDataSignals` | Signals arriving while `connectToSignaling` is still resolving |
| `pendingOutbound` | Data frames queued before DataChannel `'connect'` fires |

## Common pitfall
`connections` keys are **peer UUIDs**, not IP addresses. Always look up the peer in `usePeerStore` to get IP/port for `connectToSignaling`.
