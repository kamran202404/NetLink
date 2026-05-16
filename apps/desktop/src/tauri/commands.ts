import { invoke } from '@tauri-apps/api/core';
import { toast } from '@/shared/toastStore';

/** Wraps a command promise; shows an error toast if it rejects, then re-throws. */
function cmd<T>(p: Promise<T>, silent = false): Promise<T> {
  return p.catch((err) => {
    if (!silent) toast(`Backend error: ${String(err)}`);
    throw err;
  });
}

// All frontend → Rust commands. Add new commands here — one line per command.
// No raw invoke() calls anywhere else in the codebase.
export const tauriCommands = {
  getLocalPeerInfo: () =>
    cmd(invoke<{ id: string; name: string; hostname: string; ip: string; port: number }>('get_local_peer_info')),

  setDisplayName: (name: string) =>
    cmd(invoke<void>('set_display_name', { name })),

  startMdnsAdvertising: () =>
    cmd(invoke<void>('start_mdns_advertising')),

  stopMdns: () =>
    cmd(invoke<void>('stop_mdns')),

  getLocalSignalingAddress: () =>
    cmd(invoke<string>('get_local_signaling_address')),

  // Signaling connect is retried by peerConnectionManager; silent here to avoid double-toast.
  connectToSignaling: (address: string, peerId: string) =>
    cmd(invoke<void>('connect_to_signaling', { address, peerId }), true),

  sendSignalingMessage: (peerId: string, payload: string) =>
    cmd(invoke<void>('send_signaling_message', { peerId, payload }), true),

  getSetting: (key: string) =>
    cmd(invoke<unknown | null>('get_setting', { key })),

  setSetting: (key: string, value: unknown) =>
    cmd(invoke<void>('set_setting', { key, value })),
};
