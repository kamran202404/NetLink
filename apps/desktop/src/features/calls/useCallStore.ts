import { create } from 'zustand';
import * as pcm from './peerConnectionManager';
import { useSettingsStore } from '@/features/settings/useSettingsStore';

export interface CallStoreState {
  inCall: string | null;
  muted: boolean;
  videoOff: boolean;
  screenshare: boolean;
  speaker: boolean;
  duration: number;
  chatPanelOpen: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  incomingCallPeerId: string | null;

  startCall: (peerId: string, video?: boolean) => Promise<void>;
  acceptCall: (fromPeerId: string, video?: boolean) => Promise<void>;
  rejectCall: (fromPeerId: string) => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleScreenshare: () => void;
  toggleChatPanel: () => void;
  tick: () => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  setIncomingCall: (peerId: string) => void;
}

export const useCallStore = create<CallStoreState>()((set, get) => ({
  inCall: null,
  muted: false,
  videoOff: false,
  screenshare: false,
  speaker: true,
  duration: 0,
  chatPanelOpen: true,
  localStream: null,
  remoteStream: null,
  incomingCallPeerId: null,

  startCall: async (peerId, video = true) => {
    if (get().inCall) return;
    const { selectedCameraId, selectedMicId } = useSettingsStore.getState();
    const stream = await navigator.mediaDevices.getUserMedia({
      video: video ? (selectedCameraId ? { deviceId: { exact: selectedCameraId } } : true) : false,
      audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true,
    });
    set({ inCall: peerId, videoOff: !video, muted: false, screenshare: false, duration: 0, localStream: stream });
    await pcm.initiateCall(peerId, stream);
  },

  acceptCall: async (fromPeerId, video = true) => {
    if (get().inCall) return;
    const { selectedCameraId, selectedMicId } = useSettingsStore.getState();
    const stream = await navigator.mediaDevices.getUserMedia({
      video: video ? (selectedCameraId ? { deviceId: { exact: selectedCameraId } } : true) : false,
      audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true,
    });
    set({
      inCall: fromPeerId,
      videoOff: !video,
      muted: false,
      screenshare: false,
      duration: 0,
      localStream: stream,
      incomingCallPeerId: null,
    });
    await pcm.acceptCall(fromPeerId, stream);
  },

  rejectCall: (fromPeerId) => {
    pcm.rejectCall(fromPeerId);
    set({ incomingCallPeerId: null });
  },

  endCall: () => {
    const { inCall, localStream } = get();
    if (!inCall) return;
    // Set inCall = null first so the manager's 'close' callback guard skips
    // the second endCall() call, preventing any recursion.
    set({ inCall: null, duration: 0, screenshare: false, localStream: null, remoteStream: null });
    pcm.hangup(inCall);
    localStream?.getTracks().forEach((t) => t.stop());
  },

  toggleMute: () =>
    set((s) => {
      const newMuted = !s.muted;
      s.localStream?.getAudioTracks().forEach((t) => { t.enabled = !newMuted; });
      return { muted: newMuted };
    }),

  toggleVideo: () =>
    set((s) => {
      const newVideoOff = !s.videoOff;
      s.localStream?.getVideoTracks().forEach((t) => { t.enabled = !newVideoOff; });
      return { videoOff: newVideoOff };
    }),

  toggleScreenshare: () => set((s) => ({ screenshare: !s.screenshare })),
  toggleChatPanel:   () => set((s) => ({ chatPanelOpen: !s.chatPanelOpen })),
  tick:              () => set((s) => ({ duration: s.duration + 1 })),

  setRemoteStream: (stream) => set({ remoteStream: stream }),
  setIncomingCall: (peerId) => set({ incomingCallPeerId: peerId }),
}));
