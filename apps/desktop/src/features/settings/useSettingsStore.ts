import { create } from 'zustand';
import type { LocalPeer } from '@netlink/core';
import { tauriCommands } from '@/tauri/commands';
import { initialsFromName, colorFromId } from '@/lib/peers';

const PLACEHOLDER: LocalPeer = {
  id: '…',
  name: '…',
  hostname: '…',
  ip: '…',
  port: 0,
  initials: '?',
  color: 'oklch(0.40 0.00 0)',
};

export interface SettingsStoreState {
  local: LocalPeer;
  theme: 'dark' | 'light' | 'system';
  init: () => Promise<void>;
  setDisplayName: (name: string) => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
}

export const useSettingsStore = create<SettingsStoreState>()((set) => ({
  local: PLACEHOLDER,
  theme: 'dark',

  init: async () => {
    const info = await tauriCommands.getLocalPeerInfo();
    set({
      local: {
        id: info.id,
        name: info.name,
        hostname: info.hostname,
        ip: info.ip,
        port: info.port,
        initials: initialsFromName(info.name),
        color: colorFromId(info.id),
      },
    });
  },

  setDisplayName: (name) => {
    set((s) => ({
      local: {
        ...s.local,
        name,
        initials: initialsFromName(name),
      },
    }));
    tauriCommands.setDisplayName(name).catch(console.error);
  },

  setTheme: (theme) => set({ theme }),
}));
