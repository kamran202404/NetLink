import { create } from 'zustand';
import type { Transfer } from '@netlink/core';
import type { ControlMessage, FileChunkMessage } from '@netlink/core';
import { FileSender, FileReceiver, CHUNK_SIZE, sha256Hex } from '@netlink/core';
import { sendData, onChannelData, connectForData, onPeerDisconnected } from '@/features/calls';
import { toast } from '@/shared/toastStore';

const MB = 1024 * 1024;

// ── Module-level runtime state (not serialisable → outside Zustand) ───────────

const senders     = new Map<string, FileSender>();
const receivers   = new Map<string, FileReceiver>();
const sendBuffers = new Map<string, { peerId: string; buffer: ArrayBuffer }>();
const rcvMeta     = new Map<string, { peerId: string; name: string; totalChunks: number; sha256: string; size: number }>();

let initialized = false;

// ── Store ─────────────────────────────────────────────────────────────────────

export interface FileStoreState {
  transfers: Transfer[];
  init: () => void;
  offerFile: (peerId: string, file: File) => Promise<void>;
  acceptTransfer: (id: string) => void;
  declineTransfer: (id: string) => void;
  cancelTransfer: (id: string) => void;
  pauseTransfer: (id: string) => void;
  tickProgress: () => void;
  offerCount: () => number;
}

export const useFileStore = create<FileStoreState>()((set, get) => ({
  transfers: [],

  init: () => {
    if (initialized) return;
    initialized = true;

    // ── Incoming control messages (FILE_ variants) ─────────────────────────
    onChannelData('control', (fromPeerId, raw) => {
      const msg = raw as ControlMessage;

      if (msg.type === 'FILE_OFFER') {
        rcvMeta.set(msg.transferId, {
          peerId: fromPeerId,
          name: msg.name,
          totalChunks: msg.totalChunks,
          sha256: msg.sha256,
          size: msg.size,
        });
        const t: Transfer = {
          id: msg.transferId,
          name: msg.name,
          size: msg.size,
          sent: 0,
          direction: 'in',
          peerId: fromPeerId,
          speed: 0,
          chunks: { total: msg.totalChunks, done: 0, inflight: 0 },
          sha256: msg.sha256,
          state: 'offered',
          eta: 0,
        };
        set((s) => ({ transfers: [...s.transfers, t] }));
      }

      else if (msg.type === 'FILE_ACCEPT') {
        const buf = sendBuffers.get(msg.transferId);
        if (!buf) return;
        const totalChunks = Math.ceil(buf.buffer.byteLength / CHUNK_SIZE);
        const sender = new FileSender(
          msg.transferId,
          buf.buffer,
          (chunk) => sendData(buf.peerId, 'file-data', chunk),
          (fraction, speed, eta, done) => {
            set((s) => ({
              transfers: s.transfers.map((t) =>
                t.id === msg.transferId
                  ? { ...t, sent: fraction, speed, eta, chunks: { ...t.chunks, done, inflight: 0 } }
                  : t,
              ),
            }));
          },
          () => {
            sendData(buf.peerId, 'control', { type: 'FILE_COMPLETE', transferId: msg.transferId } as ControlMessage);
            set((s) => ({
              transfers: s.transfers.map((t) =>
                t.id === msg.transferId
                  ? { ...t, state: 'complete', sent: 1, speed: 0, eta: 0, chunks: { ...t.chunks, done: totalChunks } }
                  : t,
              ),
            }));
            sendBuffers.delete(msg.transferId);
            senders.delete(msg.transferId);
          },
        );
        senders.set(msg.transferId, sender);
        set((s) => ({
          transfers: s.transfers.map((t) =>
            t.id === msg.transferId ? { ...t, state: 'transferring' } : t,
          ),
        }));
        sender.start().catch(console.error);
      }

      else if (msg.type === 'FILE_DECLINE' || msg.type === 'FILE_CANCEL') {
        senders.get(msg.transferId)?.cancel();
        senders.delete(msg.transferId);
        sendBuffers.delete(msg.transferId);
        receivers.delete(msg.transferId);
        rcvMeta.delete(msg.transferId);
        set((s) => ({ transfers: s.transfers.filter((t) => t.id !== msg.transferId) }));
      }

      else if (msg.type === 'FILE_COMPLETE') {
        receivers.get(msg.transferId)?.finalize().catch(console.error);
      }
    });

    // ── Incoming file chunks ───────────────────────────────────────────────
    onChannelData('file-data', (_fromPeerId, raw) => {
      const chunk = raw as FileChunkMessage;
      receivers.get(chunk.transferId)?.addChunk(chunk);
    });

    // ── Peer disconnected mid-transfer → pause active transfers ───────────
    onPeerDisconnected((peerId) => {
      set((s) => ({
        transfers: s.transfers.map((t) =>
          t.peerId === peerId && t.state === 'transferring'
            ? { ...t, state: 'paused', speed: 0, eta: 0 }
            : t,
        ),
      }));
      // Cancel senders for this peer so they don't keep trying to push chunks.
      senders.forEach((sender, transferId) => {
        if (sendBuffers.get(transferId)?.peerId === peerId) {
          sender.cancel();
          senders.delete(transferId);
        }
      });
    });
  },

  offerFile: async (peerId, file) => {
    const buffer  = await file.arrayBuffer();
    const sha256  = await sha256Hex(buffer);
    const id      = crypto.randomUUID();
    const total   = Math.ceil(buffer.byteLength / CHUNK_SIZE);

    sendBuffers.set(id, { peerId, buffer });

    // Ensure there is a data connection before sending the offer.
    await connectForData(peerId);

    sendData(peerId, 'control', {
      type: 'FILE_OFFER',
      transferId: id,
      name: file.name,
      size: file.size,
      totalChunks: total,
      chunkSize: CHUNK_SIZE,
      sha256,
    } as ControlMessage);

    set((s) => ({
      transfers: [
        ...s.transfers,
        {
          id,
          name: file.name,
          size: file.size,
          sent: 0,
          direction: 'out',
          peerId,
          speed: 0,
          chunks: { total, done: 0, inflight: 0 },
          sha256,
          state: 'offered',
          eta: 0,
        } satisfies Transfer,
      ],
    }));
  },

  acceptTransfer: (id) => {
    const meta = rcvMeta.get(id);
    if (!meta) return;

    const rcv = new FileReceiver(
      id,
      { totalChunks: meta.totalChunks, totalSize: meta.size, sha256: meta.sha256 },
      (fraction, speed, eta, done) => {
        set((s) => ({
          transfers: s.transfers.map((t) =>
            t.id === id
              ? { ...t, sent: fraction, speed, eta, chunks: { ...t.chunks, done, inflight: 0 } }
              : t,
          ),
        }));
      },
      (assembled) => {
        // Save via browser download → lands in OS Downloads folder.
        const blob = new Blob([assembled]);
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = meta.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        set((s) => ({
          transfers: s.transfers.map((t) =>
            t.id === id
              ? { ...t, state: 'complete', sent: 1, speed: 0, eta: 0 }
              : t,
          ),
        }));
        receivers.delete(id);
        rcvMeta.delete(id);
      },
      (err) => {
        console.error(`[FileTransfer] ${id}: ${err}`);
        const isHashMismatch = String(err).includes('SHA-256');
        toast(
          isHashMismatch
            ? `File integrity check failed for "${meta.name}". The transfer may be corrupt.`
            : `File transfer failed: ${err}`,
          undefined,
          6000,
        );
        set((s) => ({
          transfers: s.transfers.map((t) =>
            t.id === id ? { ...t, state: 'failed' } : t,
          ),
        }));
        receivers.delete(id);
        rcvMeta.delete(id);
      },
    );
    receivers.set(id, rcv);

    sendData(meta.peerId, 'control', { type: 'FILE_ACCEPT', transferId: id } as ControlMessage);
    set((s) => ({
      transfers: s.transfers.map((t) =>
        t.id === id ? { ...t, state: 'transferring' } : t,
      ),
    }));
  },

  declineTransfer: (id) => {
    const meta = rcvMeta.get(id);
    if (meta) sendData(meta.peerId, 'control', { type: 'FILE_DECLINE', transferId: id } as ControlMessage);
    rcvMeta.delete(id);
    set((s) => ({ transfers: s.transfers.filter((t) => t.id !== id) }));
  },

  cancelTransfer: (id) => {
    const buf  = sendBuffers.get(id);
    const meta = rcvMeta.get(id);
    const peer = buf?.peerId ?? meta?.peerId;
    if (peer) sendData(peer, 'control', { type: 'FILE_CANCEL', transferId: id } as ControlMessage);
    senders.get(id)?.cancel();
    senders.delete(id);
    sendBuffers.delete(id);
    receivers.delete(id);
    rcvMeta.delete(id);
    set((s) => ({ transfers: s.transfers.filter((t) => t.id !== id) }));
  },

  pauseTransfer: (id) => {
    senders.get(id)?.cancel(); // no resume in Phase F
    set((s) => ({
      transfers: s.transfers.map((t) =>
        t.id === id ? { ...t, state: 'paused', speed: 0 } : t,
      ),
    }));
  },

  tickProgress: () => { /* progress is pushed from FileSender/FileReceiver callbacks */ },

  offerCount: () => get().transfers.filter((t) => t.state === 'offered').length,
}));
