import { create } from 'zustand';
import type { Message } from '@netlink/core';

// Mock messages keyed by peerId — matching docs/design/data.jsx
const MOCK_MESSAGES: Record<string, Message[]> = {
  '8a4f-2bc1-9d7e-401a': [
    { id: 'm1', peerId: '8a4f-2bc1-9d7e-401a', senderId: 'them', text: 'hey, you on?',                                              timestamp: Date.now() - 120000, state: 'read' },
    { id: 'm2', peerId: '8a4f-2bc1-9d7e-401a', senderId: 'me',   text: 'yep — about to start the kickoff',                          timestamp: Date.now() - 110000, state: 'read' },
    { id: 'm3', peerId: '8a4f-2bc1-9d7e-401a', senderId: 'them', text: 'sending you the latest deck — no cloud, file\'s 84 mb 😅',  timestamp: Date.now() - 100000, state: 'read' },
    { id: 'm4', peerId: '8a4f-2bc1-9d7e-401a', senderId: 'them', text: '',                                                           timestamp: Date.now() - 99000,  state: 'read', attachment: { name: 'kickoff-v3.key', size: '84.2 MB', kind: 'keynote' } },
    { id: 'm5', peerId: '8a4f-2bc1-9d7e-401a', senderId: 'me',   text: 'got it, hash matches. let\'s hop on a call when you\'re ready', timestamp: Date.now() - 90000, state: 'delivered' },
    { id: 'm6', peerId: '8a4f-2bc1-9d7e-401a', senderId: 'them', text: 'calling now',                                               timestamp: Date.now() - 80000, state: 'read' },
  ],
  'f019-cc20-7a3b-8845': [
    { id: 'm1', peerId: 'f019-cc20-7a3b-8845', senderId: 'them', text: 'morning! coffee before standup?', timestamp: Date.now() - 3600000, state: 'read' },
    { id: 'm2', peerId: 'f019-cc20-7a3b-8845', senderId: 'me',   text: 'yes pls. on my way down',          timestamp: Date.now() - 3500000, state: 'read' },
  ],
  '26c3-1118-bb0e-9911': [
    { id: 'm1', peerId: '26c3-1118-bb0e-9911', senderId: 'me',   text: 'need the raw footage from sat shoot when you\'re free', timestamp: Date.now() - 86400000, state: 'read' },
    { id: 'm2', peerId: '26c3-1118-bb0e-9911', senderId: 'them', text: 'queuing it up — 12 gb, gonna leave the box on overnight', timestamp: Date.now() - 85000000, state: 'read' },
  ],
};

export interface ChatStoreState {
  messages: Record<string, Message[]>;
  sendMessage: (peerId: string, text: string) => void;
  receiveMessage: (msg: Message) => void;
  markDelivered: (peerId: string, msgId: string) => void;
  markRead: (peerId: string, msgId: string) => void;
}

export const useChatStore = create<ChatStoreState>()((set) => ({
  messages: MOCK_MESSAGES,

  sendMessage: (peerId, text) => {
    const id = 'm' + Math.random().toString(36).slice(2, 8);
    const msg: Message = {
      id,
      peerId,
      senderId: 'me',
      text,
      timestamp: Date.now(),
      state: 'sent',
    };
    set((s) => ({
      messages: { ...s.messages, [peerId]: [...(s.messages[peerId] ?? []), msg] },
    }));
    // Simulate delivery → read
    setTimeout(() => set((s) => ({
      messages: { ...s.messages, [peerId]: (s.messages[peerId] ?? []).map((m) => m.id === id ? { ...m, state: 'delivered' } : m) },
    })), 400);
    setTimeout(() => set((s) => ({
      messages: { ...s.messages, [peerId]: (s.messages[peerId] ?? []).map((m) => m.id === id ? { ...m, state: 'read' } : m) },
    })), 1400);
  },

  receiveMessage: (msg) =>
    set((s) => ({
      messages: { ...s.messages, [msg.peerId]: [...(s.messages[msg.peerId] ?? []), msg] },
    })),

  markDelivered: (peerId, msgId) =>
    set((s) => ({
      messages: { ...s.messages, [peerId]: (s.messages[peerId] ?? []).map((m) => m.id === msgId ? { ...m, state: 'delivered' } : m) },
    })),

  markRead: (peerId, msgId) =>
    set((s) => ({
      messages: { ...s.messages, [peerId]: (s.messages[peerId] ?? []).map((m) => m.id === msgId ? { ...m, state: 'read' } : m) },
    })),
}));
