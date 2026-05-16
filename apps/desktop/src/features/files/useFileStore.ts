import { create } from 'zustand';
import type { Transfer } from '@netlink/core';

const MB = 1024 * 1024;
const GB = 1024 * MB;

// Mock transfers matching docs/design/data.jsx
const MOCK_TRANSFERS: Transfer[] = [
  { id: 't-9d2a', name: 'kickoff-v3.key',              size: 84.2 * MB,   sent: 0.62, direction: 'in',  peerId: '8a4f-2bc1-9d7e-401a', speed: 11.4, chunks: { total: 1347,    done: 836,    inflight: 8 }, sha256: 'a3f9c2b8e1d04f7e23b8...c41a', state: 'transferring', eta: 5   },
  { id: 't-71fb', name: 'raw_footage_sat.zip',          size: 12.4 * GB,   sent: 0.18, direction: 'in',  peerId: '26c3-1118-bb0e-9911', speed: 28.6, chunks: { total: 203456,  done: 36622,  inflight: 8 }, sha256: '7c1d9a44b22f1e0a98b7...e0fa', state: 'transferring', eta: 380 },
  { id: 't-22aa', name: 'weekly-notes.md',              size: 14233,       sent: 1,    direction: 'out', peerId: 'f019-cc20-7a3b-8845', speed: 0,    chunks: { total: 1,       done: 1,      inflight: 0 }, sha256: 'e91f...77a3',                state: 'complete',     eta: 0   },
  { id: 't-44c1', name: 'build-artifact-2026-05-12.tar.zst', size: 412 * MB, sent: 1, direction: 'out', peerId: '26c3-1118-bb0e-9911', speed: 0,    chunks: { total: 6594,    done: 6594,   inflight: 0 }, sha256: '55c4...ab02',                state: 'complete',     eta: 0   },
  { id: 't-55de', name: 'design-system-v2.zip',         size: 38 * MB,     sent: 0,    direction: 'in',  peerId: '31df-2200-49ee-7780', speed: 0,    chunks: { total: 609,     done: 0,      inflight: 0 }, sha256: 'd10e...0091',                state: 'offered',      eta: 0   },
];

export interface FileStoreState {
  transfers: Transfer[];
  acceptTransfer: (id: string) => void;
  declineTransfer: (id: string) => void;
  cancelTransfer: (id: string) => void;
  pauseTransfer: (id: string) => void;
  tickProgress: () => void;
  offerCount: () => number;
}

export const useFileStore = create<FileStoreState>()((set, get) => ({
  transfers: MOCK_TRANSFERS,

  acceptTransfer: (id) =>
    set((s) => ({
      transfers: s.transfers.map((t) =>
        t.id === id
          ? { ...t, state: 'transferring', speed: 8 + Math.random() * 8, eta: t.size / ((8 + Math.random() * 8) * MB) }
          : t,
      ),
    })),

  declineTransfer: (id) =>
    set((s) => ({ transfers: s.transfers.filter((t) => t.id !== id) })),

  cancelTransfer: (id) =>
    set((s) => ({ transfers: s.transfers.filter((t) => t.id !== id) })),

  pauseTransfer: (id) =>
    set((s) => ({
      transfers: s.transfers.map((t) => (t.id === id ? { ...t, state: 'paused', speed: 0 } : t)),
    })),

  tickProgress: () =>
    set((s) => ({
      transfers: s.transfers.map((t) => {
        if (t.state !== 'transferring') return t;
        const inc = (t.speed * MB) / t.size;
        const sent = Math.min(1, t.sent + inc);
        const eta = sent >= 1 ? 0 : (t.size * (1 - sent)) / (t.speed * MB);
        const chunksDone = Math.round(sent * t.chunks.total);
        return { ...t, sent, eta, chunks: { ...t.chunks, done: chunksDone }, state: sent >= 1 ? 'complete' : 'transferring' };
      }),
    })),

  offerCount: () => get().transfers.filter((t) => t.state === 'offered').length,
}));
