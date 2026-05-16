import { create } from 'zustand';
import type { Peer } from '@netlink/core';

// Mock peers matching docs/design/data.jsx
const MOCK_PEERS: Peer[] = [
  { id: '8a4f-2bc1-9d7e-401a', name: 'Daniel Hu',     hostname: 'daniel-thinkpad.local', ip: '192.168.1.51', port: 49231, os: 'Linux',       initials: 'DH', color: 'oklch(0.78 0.13 35)',  status: 'online',  signal: 4, ping: 3,  lastSeen: 'now', unread: 2 },
  { id: 'f019-cc20-7a3b-8845', name: 'Sora Tanaka',   hostname: 'sora-precision.local',  ip: '192.168.1.78', port: 52001, os: 'Windows 11',   initials: 'ST', color: 'oklch(0.75 0.13 280)', status: 'in-call', signal: 4, ping: 5,  lastSeen: 'now', unread: 0 },
  { id: '26c3-1118-bb0e-9911', name: 'Júlia Almeida', hostname: 'julia-mbp.local',       ip: '192.168.1.66', port: 50112, os: 'macOS 14.2',   initials: 'JA', color: 'oklch(0.80 0.13 80)',  status: 'online',  signal: 3, ping: 8,  lastSeen: 'now', unread: 0 },
  { id: '7715-90fa-ab32-cc01', name: 'Studio NAS',    hostname: 'studio-nas.local',      ip: '192.168.1.10', port: 51200, os: 'Linux',         initials: 'NA', color: 'oklch(0.75 0.10 220)', status: 'online',  signal: 4, ping: 1,  lastSeen: 'now', unread: 0, isService: true },
  { id: '31df-2200-49ee-7780', name: 'Marco Bianchi', hostname: 'marco-laptop.local',    ip: '192.168.1.92', port: 50988, os: 'Windows 10',    initials: 'MB', color: 'oklch(0.78 0.13 12)',  status: 'idle',    signal: 2, ping: 22, lastSeen: '2m',  unread: 0 },
  { id: '9921-baf0-1c33-66de', name: 'Aiyana Cloud',  hostname: 'aiyana-fedora.local',   ip: '192.168.1.103',port: 51331, os: 'Linux',         initials: 'AC', color: 'oklch(0.80 0.13 175)', status: 'idle',    signal: 3, ping: 11, lastSeen: '5m',  unread: 0 },
];

export interface PeerStoreState {
  peers: Peer[];
  activePeerId: string;
  setActivePeer: (id: string) => void;
  addPeer: (peer: Peer) => void;
  removePeer: (id: string) => void;
  updatePeer: (id: string, patch: Partial<Peer>) => void;
  totalUnread: () => number;
}

export const usePeerStore = create<PeerStoreState>()((set, get) => ({
  peers: MOCK_PEERS,
  activePeerId: MOCK_PEERS[0]!.id,
  setActivePeer: (id) => set({ activePeerId: id }),
  addPeer: (peer) => set((s) => ({ peers: [...s.peers, peer] })),
  removePeer: (id) => set((s) => ({ peers: s.peers.filter((p) => p.id !== id) })),
  updatePeer: (id, patch) =>
    set((s) => ({ peers: s.peers.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
  totalUnread: () => get().peers.reduce((sum, p) => sum + p.unread, 0),
}));
