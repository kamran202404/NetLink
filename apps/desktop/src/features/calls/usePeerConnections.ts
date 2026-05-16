import { useCallback, useEffect } from 'react';
import { useTauriEvent } from '@/tauri/events';
import type { TauriEvents } from '@/tauri/events';
import { useCallStore } from './useCallStore';
import * as pcm from './peerConnectionManager';

/**
 * Mounts the WebRTC signaling bridge between Tauri events and the
 * peerConnectionManager.  Must be called once, high in the React tree (App.tsx).
 */
export function usePeerConnections(): void {
  // Register store callbacks once so the manager can update call state without
  // importing useCallStore directly (which would create a circular dep).
  useEffect(() => {
    pcm.setCallbacks({
      onIncomingCall: (fromPeerId) => useCallStore.getState().setIncomingCall(fromPeerId),
      onRemoteStream: (stream)     => useCallStore.getState().setRemoteStream(stream),
      onCallEnded:    ()           => useCallStore.getState().endCall(),
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSignalingMessage = useCallback(
    (payload: TauriEvents['signaling-message-received']) => {
      pcm.handleIncomingSignal(payload.fromPeerId, payload.payload);
    },
    [],
  );

  useTauriEvent('signaling-message-received', handleSignalingMessage);
}
