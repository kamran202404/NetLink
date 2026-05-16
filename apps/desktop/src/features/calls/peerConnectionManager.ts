import SimplePeer from 'simple-peer';
import { tauriCommands } from '@/tauri/commands';
import { usePeerStore } from '@/features/peers/usePeerStore';

// ── Callback surface (avoids circular dep with useCallStore) ─────────────────

type ManagerCallbacks = {
  onIncomingCall: (fromPeerId: string) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onCallEnded: () => void;
};

let cb: ManagerCallbacks = {
  onIncomingCall: () => {},
  onRemoteStream: () => {},
  onCallEnded:    () => {},
};

export function setCallbacks(callbacks: ManagerCallbacks): void {
  cb = callbacks;
}

// ── Connection state ─────────────────────────────────────────────────────────

const connections   = new Map<string, SimplePeer.Instance>();
// Signals that arrive before the user accepts an incoming call are queued here.
const pendingSignals = new Map<string, SimplePeer.SignalData[]>();

// ── Internal helpers ─────────────────────────────────────────────────────────

function wirePeer(pc: SimplePeer.Instance, peerId: string): void {
  pc.on('signal', (data: SimplePeer.SignalData) => {
    tauriCommands.sendSignalingMessage(peerId, JSON.stringify(data)).catch(console.error);
  });

  pc.on('stream', (stream: MediaStream) => {
    cb.onRemoteStream(stream);
  });

  // On close/error: clean up and notify the store only if the connection is
  // still in our map (prevents double-trigger when hangup() is the initiator).
  const onEnded = () => {
    if (connections.has(peerId)) {
      connections.delete(peerId);
      cb.onCallEnded();
    }
  };

  pc.on('close', onEnded);
  pc.on('error', (err: Error) => {
    console.error(`[WebRTC] error with ${peerId}:`, err);
    onEnded();
  });
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Initiate an outbound call to a discovered peer. */
export async function initiateCall(peerId: string, localStream: MediaStream): Promise<void> {
  const peer = usePeerStore.getState().peers.find((p) => p.id === peerId);
  if (!peer) return;

  await tauriCommands.connectToSignaling(`ws://${peer.ip}:${peer.port}`, peerId);

  const pc = new SimplePeer({
    initiator: true,
    trickle: true,
    stream: localStream,
    config: { iceServers: [] },
  });
  connections.set(peerId, pc);
  wirePeer(pc, peerId);
}

/** Accept a queued incoming call. Creates the non-initiator peer and feeds
 *  all signals that arrived while the user was looking at the modal. */
export async function acceptCall(fromPeerId: string, localStream: MediaStream): Promise<void> {
  const peer = usePeerStore.getState().peers.find((p) => p.id === fromPeerId);
  if (!peer) return;

  await tauriCommands.connectToSignaling(`ws://${peer.ip}:${peer.port}`, fromPeerId);

  const pc = new SimplePeer({
    initiator: false,
    trickle: true,
    stream: localStream,
    config: { iceServers: [] },
  });
  connections.set(fromPeerId, pc);
  wirePeer(pc, fromPeerId);

  // Feed signals that trickled in while the modal was visible.
  const queued = pendingSignals.get(fromPeerId) ?? [];
  pendingSignals.delete(fromPeerId);
  queued.forEach((s) => pc.signal(s));
}

/** Discard a queued incoming call without creating a connection. */
export function rejectCall(fromPeerId: string): void {
  pendingSignals.delete(fromPeerId);
}

/** Tear down an active connection.  Safe to call even if already closed. */
export function hangup(peerId: string): void {
  const pc = connections.get(peerId);
  // Remove from map BEFORE destroy() so the 'close' handler's onEnded guard
  // skips the cb.onCallEnded() callback — the caller is already handling it.
  connections.delete(peerId);
  pendingSignals.delete(peerId);
  pc?.destroy();
}

/** Route an inbound signaling payload to the correct peer connection.
 *  If no connection exists yet, this is treated as an incoming call. */
export function handleIncomingSignal(fromPeerId: string, rawPayload: string): void {
  let signalData: SimplePeer.SignalData;
  try {
    signalData = JSON.parse(rawPayload) as SimplePeer.SignalData;
  } catch {
    console.error('[WebRTC] invalid signal JSON from', fromPeerId);
    return;
  }

  const existing = connections.get(fromPeerId);
  if (existing) {
    existing.signal(signalData);
    return;
  }

  // No active connection — first signal from this peer means incoming call.
  if (!pendingSignals.has(fromPeerId)) {
    pendingSignals.set(fromPeerId, [signalData]);
    cb.onIncomingCall(fromPeerId);
  } else {
    // Trickle ICE arriving before the user accepted — queue it.
    pendingSignals.get(fromPeerId)!.push(signalData);
  }
}

/** Send raw data over the SimplePeer data channel (Phase E: chat / control). */
export function sendData(peerId: string, data: string): void {
  const pc = connections.get(peerId);
  if (pc?.connected) {
    pc.send(data);
  }
}
