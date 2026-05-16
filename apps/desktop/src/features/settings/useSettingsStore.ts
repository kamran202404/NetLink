import { create } from 'zustand';
import type { LocalPeer } from '@netlink/core';

export interface SettingsStoreState {
  local: LocalPeer;
  theme: 'dark' | 'light' | 'system';
  setDisplayName: (name: string) => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
}

export const useSettingsStore = create<SettingsStoreState>()((set) => ({
  local: {
    id: 'p1f2-3a9b-c4d5-e6f0',
    name: 'Mira K.',
    hostname: 'mira-mbp.local',
    ip: '192.168.1.42',
    port: 51874,
    os: 'macOS 14.4',
    initials: 'MK',
    color: 'oklch(0.82 0.16 165)',
  },
  theme: 'dark',
  setDisplayName: (name) => set((s) => ({ local: { ...s.local, name } })),
  setTheme: (theme) => set({ theme }),
}));
