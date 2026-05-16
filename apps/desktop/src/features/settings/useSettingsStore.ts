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
  selectedCameraId: string | null;
  selectedMicId: string | null;
  init: () => Promise<void>;
  setDisplayName: (name: string) => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  setCamera: (deviceId: string | null) => void;
  setMic: (deviceId: string | null) => void;
}

export const useSettingsStore = create<SettingsStoreState>()((set) => ({
  local: PLACEHOLDER,
  theme: 'dark',
  selectedCameraId: null,
  selectedMicId: null,

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

    // Load persisted settings.
    const [theme, cameraId, micId] = await Promise.all([
      tauriCommands.getSetting('theme'),
      tauriCommands.getSetting('camera_device_id'),
      tauriCommands.getSetting('mic_device_id'),
    ]);
    set({
      theme: (theme as 'dark' | 'light' | 'system' | null) ?? 'dark',
      selectedCameraId: (cameraId as string | null) ?? null,
      selectedMicId: (micId as string | null) ?? null,
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
    tauriCommands.setSetting('display_name', name).catch(console.error);
  },

  setTheme: (theme) => {
    set({ theme });
    tauriCommands.setSetting('theme', theme).catch(console.error);
  },

  setCamera: (deviceId) => {
    set({ selectedCameraId: deviceId });
    tauriCommands.setSetting('camera_device_id', deviceId).catch(console.error);
  },

  setMic: (deviceId) => {
    set({ selectedMicId: deviceId });
    tauriCommands.setSetting('mic_device_id', deviceId).catch(console.error);
  },
}));
