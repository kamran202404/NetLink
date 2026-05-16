import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { useEffect } from 'react';

// All Rust → frontend events. Add new events here — one line per event.
// The hook below is generic; no other files need to change when events are added.
export interface TauriEvents {
  'peer-discovered': { id: string; name: string; address: string; port: number };
  'peer-lost':       { id: string };
  'signaling-message-received': { fromPeerId: string; payload: string };
  'call-requested':  { fromPeerId: string; signalingAddress: string };
}

// Typed event listener hook. Usage:
//   useTauriEvent('peer-discovered', (payload) => store.addPeer(payload));
export function useTauriEvent<K extends keyof TauriEvents>(
  event: K,
  handler: (payload: TauriEvents[K]) => void,
): void {
  useEffect(() => {
    let unlisten: UnlistenFn | undefined;

    listen<TauriEvents[K]>(event, (e) => handler(e.payload))
      .then((fn) => { unlisten = fn; })
      .catch(console.error);

    return () => { unlisten?.(); };
  }, [event, handler]);
}
