import { create } from 'zustand';
import type { Peer } from '@netlink/core';

export interface PeerStoreState {
  peers: Peer[];
  activePeerId: string | null;
  setActivePeer: (id: string) => void;
  addPeer: (peer: Peer) => void;
  removePeer: (id: string) => void;
  updatePeer: (id: string, patch: Partial<Peer>) => void;
  totalUnread: () => number;
}

export const usePeerStore = create<PeerStoreState>()((set, get) => ({
  peers: [],
  activePeerId: null,

  setActivePeer: (id) => set({ activePeerId: id }),

  addPeer: (peer) =>
    set((s) => {
      const exists = s.peers.some((p) => p.id === peer.id);
      return {
        peers: exists
          ? s.peers.map((p) => (p.id === peer.id ? { ...p, ...peer } : p))
          : [...s.peers, peer],
        // Auto-select the first peer that arrives so the UI isn't stuck on null.
        activePeerId: s.activePeerId ?? peer.id,
      };
    }),

  removePeer: (id) =>
    set((s) => {
      const peers = s.peers.filter((p) => p.id !== id);
      const activePeerId =
        s.activePeerId === id ? (peers[0]?.id ?? null) : s.activePeerId;
      return { peers, activePeerId };
    }),

  updatePeer: (id, patch) =>
    set((s) => ({
      peers: s.peers.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),

  totalUnread: () => get().peers.reduce((sum, p) => sum + p.unread, 0),
}));
