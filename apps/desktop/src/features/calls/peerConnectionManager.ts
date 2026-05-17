import SimplePeer from 'simple-peer';
import type { Peer } from '@netlink/core';
import { tauriCommands } from '@/tauri/commands';
import { usePeerStore } from '@/features/peers/usePeerStore';
import { toast } from '@/shared/toastStore';
import { colorFromId } from '@/lib/peers';

// ── Logical channel types (multiplexed over single DataChannel) ───────────────

export type ChannelName = 'control' | 'chat' | 'file-data';
type ChannelFrame   = { ch: ChannelName; payload: unknown };
type ChannelHandler = (fromPeerId: string, payload: unknown) => void;

const dataHandlers = new Map<ChannelName, ChannelHandler[]>();

/** Register a handler for a named logical channel. Multiple handlers per channel are allowed. */
export function onChannelData(ch: ChannelName, handler: ChannelHandler): void {
  if (!dataHandlers.has(ch)) dataHandlers.set(ch, []);
  dataHandlers.get(ch)!.push(handler);
}

// ── Peer-disconnected subscribers ─────────────────────────────────────────────

const peerDisconnectedHandlers: ((peerId: string) => void)[] = [];

/** Register a callback fired whenever any peer connection closes (call or data). */
export function onPeerDisconnected(handler: (peerId: string) => void): void {
  peerDisconnectedHandlers.push(handler);
}

// ── Signaling envelope — distinguishes calls from data-only connections ───────

type ConnType = 'call' | 'data';
interface SignalingEnvelope {
  connType: ConnType;
  signal: SimplePeer.SignalData;
}

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

const connections        = new Map<string, SimplePeer.Instance>();
// Signals queued while the IncomingCallModal is shown (call connections).
const pendingSignals     = new Map<string, SimplePeer.SignalData[]>();
// Signals queued while we're auto-accepting a data-only connection (async).
const pendingDataSignals = new Map<string, SimplePeer.SignalData[]>();
// Messages queued before the DataChannel is open (not yet connected).
const pendingOutbound    = new Map<string, ChannelFrame[]>();

// ── Internal helpers ─────────────────────────────────────────────────────────

function makePeer(initiator: boolean, stream?: MediaStream): SimplePeer.Instance {
  return new SimplePeer({
    initiator,
    trickle: true,
    ...(stream ? { stream } : {}),
    config: { iceServers: [] },
  });
}

function wirePeer(pc: SimplePeer.Instance, peerId: string, connType: ConnType): void {
  pc.on('signal', (data: SimplePeer.SignalData) => {
    const envelope: SignalingEnvelope = { connType, signal: data };
    tauriCommands.sendSignalingMessage(peerId, JSON.stringify(envelope)).catch(console.error);
  });

  pc.on('stream', (stream: MediaStream) => {
    if (connType === 'call') cb.onRemoteStream(stream);
  });

  pc.on('connect', () => {
    // Flush outbound messages queued before the DataChannel was ready.
    const queue = pendingOutbound.get(peerId) ?? [];
    pendingOutbound.delete(peerId);
    queue.forEach(({ ch, payload }) => pc.send(JSON.stringify({ ch, payload })));
  });

  pc.on('data', (rawData: Buffer | string) => {
    try {
      const frame = JSON.parse(rawData.toString()) as ChannelFrame;
      dataHandlers.get(frame.ch)?.forEach((h) => h(peerId, frame.payload));
    } catch { /* ignore malformed frames */ }
  });

  const onEnded = () => {
    if (connections.has(peerId)) {
      connections.delete(peerId);
      pendingOutbound.delete(peerId);
      if (connType === 'call') cb.onCallEnded();
      peerDisconnectedHandlers.forEach((h) => h(peerId));
    }
  };

  pc.on('close', onEnded);
  pc.on('error', (err: Error) => {
    console.error(`[WebRTC] error with ${peerId}:`, err);
    onEnded();
  });
}

/** Connect to the peer's signaling server with up to 3 retries (1 s / 2 s / 4 s backoff). */
async function connectWithRetry(address: string, peerId: string, peerName: string): Promise<void> {
  const delays = [1000, 2000, 4000];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      await tauriCommands.connectToSignaling(address, peerId);
      return;
    } catch (err) {
      if (attempt < delays.length) {
        await new Promise((r) => setTimeout(r, delays[attempt]));
      } else {
        toast(
          `Could not reach ${peerName}.`,
          { label: 'Retry', onClick: () => tauriCommands.connectToSignaling(address, peerId).catch(console.error) },
          6000,
        );
        throw err;
      }
    }
  }
}

/** Synthesize a placeholder peer entry from a remote peer id we've only seen on
 *  inbound signaling.  mDNS resolution will upsert real fields when (and if)
 *  it arrives.  Used so the incoming-call modal can render even when our side
 *  hasn't discovered the caller yet. */
function ensurePeerEntry(peerId: string): void {
  const store = usePeerStore.getState();
  if (store.peers.some((p) => p.id === peerId)) return;
  const placeholder: Peer = {
    id: peerId,
    name: 'Unknown peer',
    hostname: 'unknown',
    ip: '',
    port: 0,
    initials: '?',
    color: colorFromId(peerId),
    status: 'online',
    signal: 4,
    ping: 0,
    lastSeen: 'now',
    unread: 0,
  };
  store.addPeer(placeholder);
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Initiate an outbound call (media + data channel). */
export async function initiateCall(peerId: string, localStream: MediaStream): Promise<void> {
  const peer = usePeerStore.getState().peers.find((p) => p.id === peerId);
  if (!peer) return;
  await connectWithRetry(`ws://${peer.ip}:${peer.port}`, peerId, peer.name);
  const pc = makePeer(true, localStream);
  connections.set(peerId, pc);
  wirePeer(pc, peerId, 'call');
}

/** Accept a queued incoming call; feeds signals that arrived while modal was shown. */
export async function acceptCall(fromPeerId: string, localStream: MediaStream): Promise<void> {
  const peer = usePeerStore.getState().peers.find((p) => p.id === fromPeerId);
  // If we have an address for the peer, opportunistically dial them too.
  // The Rust side is idempotent and the inbound socket the caller opened is
  // already usable for our replies, so skipping the dial is fine when we
  // don't know the peer's address.
  if (peer && peer.ip && peer.port) {
    await connectWithRetry(`ws://${peer.ip}:${peer.port}`, fromPeerId, peer.name).catch(() => {});
  }
  const pc = makePeer(false, localStream);
  connections.set(fromPeerId, pc);
  wirePeer(pc, fromPeerId, 'call');
  const queued = pendingSignals.get(fromPeerId) ?? [];
  pendingSignals.delete(fromPeerId);
  queued.forEach((s) => pc.signal(s));
}

/** Ensure a data-only connection to a peer exists (idempotent). */
export async function connectForData(peerId: string): Promise<void> {
  if (connections.has(peerId)) return;
  const peer = usePeerStore.getState().peers.find((p) => p.id === peerId);
  if (!peer) return;
  await connectWithRetry(`ws://${peer.ip}:${peer.port}`, peerId, peer.name);
  const pc = makePeer(true);
  connections.set(peerId, pc);
  wirePeer(pc, peerId, 'data');
}

/** Discard a queued incoming call without creating a connection. */
export function rejectCall(fromPeerId: string): void {
  pendingSignals.delete(fromPeerId);
}

/** Tear down an active connection.  Safe to call even if already closed. */
export function hangup(peerId: string): void {
  const pc = connections.get(peerId);
  // Delete BEFORE destroy() so the 'close' handler's guard skips onCallEnded().
  connections.delete(peerId);
  pendingSignals.delete(peerId);
  pendingDataSignals.delete(peerId);
  pendingOutbound.delete(peerId);
  pc?.destroy();
}

/** Send data on a named logical channel.  Queues if the DataChannel isn't open yet. */
export function sendData(peerId: string, ch: ChannelName, payload: unknown): void {
  const pc = connections.get(peerId);
  if (!pc) return;
  const frame: ChannelFrame = { ch, payload };
  if (pc.connected) {
    pc.send(JSON.stringify(frame));
  } else {
    if (!pendingOutbound.has(peerId)) pendingOutbound.set(peerId, []);
    pendingOutbound.get(peerId)!.push(frame);
  }
}

/** Route an inbound signaling envelope to the correct peer connection. */
export function handleIncomingSignal(fromPeerId: string, rawPayload: string): void {
  let envelope: SignalingEnvelope;
  try {
    envelope = JSON.parse(rawPayload) as SignalingEnvelope;
  } catch {
    console.error('[WebRTC] invalid signal JSON from', fromPeerId);
    return;
  }

  // Feed to existing connection (trickle-ICE candidates, answer SDP, etc.)
  const existing = connections.get(fromPeerId);
  if (existing) {
    existing.signal(envelope.signal);
    return;
  }

  if (envelope.connType === 'data') {
    // Auto-accept data connection.  We can reply through the same inbound
    // socket Rust already accepted, so we don't need our own outbound dial —
    // and therefore don't need to know the peer's ip/port (which we wouldn't
    // have if mDNS hasn't resolved them yet on our side).
    if (pendingDataSignals.has(fromPeerId)) {
      pendingDataSignals.get(fromPeerId)!.push(envelope.signal);
      return;
    }
    const pc = makePeer(false);
    connections.set(fromPeerId, pc);
    wirePeer(pc, fromPeerId, 'data');
    pc.signal(envelope.signal);
  } else {
    // Call: show IncomingCallModal, queue trickle-ICE signals.
    // Synthesize a placeholder peer if mDNS hasn't resolved the caller on our
    // side yet — otherwise the modal has nothing to render against.
    ensurePeerEntry(fromPeerId);
    if (!pendingSignals.has(fromPeerId)) {
      pendingSignals.set(fromPeerId, [envelope.signal]);
      cb.onIncomingCall(fromPeerId);
    } else {
      pendingSignals.get(fromPeerId)!.push(envelope.signal);
    }
  }
}
