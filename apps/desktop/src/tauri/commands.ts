import { invoke } from '@tauri-apps/api/core';

// All frontend → Rust commands. Add new commands here — one line per command.
// No raw invoke() calls anywhere else in the codebase.
export const tauriCommands = {
  getLocalPeerInfo: () =>
    invoke<{ id: string; name: string; hostname: string; ip: string; port: number }>('get_local_peer_info'),

  setDisplayName: (name: string) =>
    invoke<void>('set_display_name', { name }),

  startMdnsAdvertising: () =>
    invoke<void>('start_mdns_advertising'),

  stopMdns: () =>
    invoke<void>('stop_mdns'),

  getLocalSignalingAddress: () =>
    invoke<string>('get_local_signaling_address'),

  connectToSignaling: (address: string, peerId: string) =>
    invoke<void>('connect_to_signaling', { address, peerId }),

  sendSignalingMessage: (peerId: string, payload: string) =>
    invoke<void>('send_signaling_message', { peerId, payload }),
};
