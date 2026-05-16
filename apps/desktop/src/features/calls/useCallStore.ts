import { create } from 'zustand';

export interface CallStoreState {
  inCall: string | null;        // peerId
  muted: boolean;
  videoOff: boolean;
  screenshare: boolean;
  speaker: boolean;
  duration: number;             // seconds, ticked by App.tsx
  chatPanelOpen: boolean;
  startCall: (peerId: string, video?: boolean) => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleScreenshare: () => void;
  toggleChatPanel: () => void;
  tick: () => void;
}

export const useCallStore = create<CallStoreState>()((set) => ({
  inCall: null,
  muted: false,
  videoOff: false,
  screenshare: false,
  speaker: true,
  duration: 0,
  chatPanelOpen: true,
  startCall: (peerId, video = true) =>
    set({ inCall: peerId, videoOff: !video, muted: false, screenshare: false, duration: 0 }),
  endCall: () => set({ inCall: null, duration: 0, screenshare: false }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  toggleVideo: () => set((s) => ({ videoOff: !s.videoOff })),
  toggleScreenshare: () => set((s) => ({ screenshare: !s.screenshare })),
  toggleChatPanel: () => set((s) => ({ chatPanelOpen: !s.chatPanelOpen })),
  tick: () => set((s) => ({ duration: s.duration + 1 })),
}));
