import { create } from 'zustand';
import type { Message } from '@netlink/core';
import type { ControlMessage, ChatMessage } from '@netlink/core';
import { usePeerStore } from '@/features/peers/usePeerStore';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { sendData, onChannelData, connectForData } from '@/features/calls';
import * as db from '@/tauri/db';

let initialized = false;

export interface ChatStoreState {
  messages: Record<string, Message[]>;
  init: () => void;
  loadMessages: (peerId: string) => Promise<void>;
  sendMessage: (peerId: string, text: string) => void;
  markDelivered: (peerId: string, msgId: string) => void;
  markRead: (peerId: string) => void;
}

export const useChatStore = create<ChatStoreState>()((set, get) => ({
  messages: {},

  init: () => {
    if (initialized) return;
    initialized = true;
    db.initDb().catch(console.error);

    // ── Incoming chat message ────────────────────────────────────────────────
    onChannelData('chat', (fromPeerId, raw) => {
      const wire = raw as ChatMessage;
      const activePeerId = usePeerStore.getState().activePeerId;
      const state: Message['state'] = activePeerId === fromPeerId ? 'read' : 'delivered';

      const msg: Message = {
        id: wire.id,
        peerId: fromPeerId,
        senderId: wire.senderId,
        text: wire.text,
        timestamp: wire.timestamp,
        state,
      };
      set((s) => ({
        messages: {
          ...s.messages,
          [fromPeerId]: [...(s.messages[fromPeerId] ?? []), msg],
        },
      }));
      db.saveMessage(msg).catch(console.error);

      // Always send delivered ack.
      sendData(fromPeerId, 'control', { type: 'CHAT_DELIVERED', id: wire.id } as ControlMessage);

      if (state === 'read') {
        // Chat is open — immediately send read ack too.
        sendData(fromPeerId, 'control', { type: 'CHAT_READ', id: wire.id } as ControlMessage);
        db.updateMessageState(wire.id, 'read').catch(console.error);
      } else {
        // Increment unread badge for this peer.
        const peer = usePeerStore.getState().peers.find((p) => p.id === fromPeerId);
        usePeerStore.getState().updatePeer(fromPeerId, { unread: (peer?.unread ?? 0) + 1 });
      }
    });

    // ── Incoming control message (acks from the remote peer) ─────────────────
    onChannelData('control', (fromPeerId, raw) => {
      const msg = raw as ControlMessage;
      if (msg.type === 'CHAT_DELIVERED') {
        set((s) => ({
          messages: {
            ...s.messages,
            [fromPeerId]: (s.messages[fromPeerId] ?? []).map((m) =>
              m.id === msg.id ? { ...m, state: 'delivered' } : m,
            ),
          },
        }));
        db.updateMessageState(msg.id, 'delivered').catch(console.error);
      } else if (msg.type === 'CHAT_READ') {
        set((s) => ({
          messages: {
            ...s.messages,
            [fromPeerId]: (s.messages[fromPeerId] ?? []).map((m) =>
              m.id === msg.id ? { ...m, state: 'read' } : m,
            ),
          },
        }));
        db.updateMessageState(msg.id, 'read').catch(console.error);
      }
    });
  },

  loadMessages: async (peerId) => {
    const msgs = await db.loadMessages(peerId);
    set((s) => ({ messages: { ...s.messages, [peerId]: msgs } }));
  },

  sendMessage: (peerId, text) => {
    const localId = useSettingsStore.getState().local.id;
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    const msg: Message = { id, peerId, senderId: 'me', text, timestamp, state: 'sent' };
    set((s) => ({
      messages: { ...s.messages, [peerId]: [...(s.messages[peerId] ?? []), msg] },
    }));
    db.saveMessage(msg).catch(console.error);

    // connectForData is idempotent; sendData queues until the channel opens.
    const wire: ChatMessage = { id, senderId: localId, text, timestamp };
    connectForData(peerId)
      .then(() => sendData(peerId, 'chat', wire))
      .catch(console.error);
  },

  markDelivered: (peerId, msgId) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [peerId]: (s.messages[peerId] ?? []).map((m) =>
          m.id === msgId ? { ...m, state: 'delivered' } : m,
        ),
      },
    })),

  markRead: (peerId) => {
    const msgs = get().messages[peerId] ?? [];
    const toAck = msgs.filter((m) => m.senderId !== 'me' && m.state !== 'read');
    if (toAck.length === 0) {
      usePeerStore.getState().updatePeer(peerId, { unread: 0 });
      return;
    }
    toAck.forEach((m) => {
      sendData(peerId, 'control', { type: 'CHAT_READ', id: m.id } as ControlMessage);
      db.updateMessageState(m.id, 'read').catch(console.error);
    });
    set((s) => ({
      messages: {
        ...s.messages,
        [peerId]: (s.messages[peerId] ?? []).map((m) =>
          m.senderId !== 'me' ? { ...m, state: 'read' } : m,
        ),
      },
    }));
    usePeerStore.getState().updatePeer(peerId, { unread: 0 });
  },
}));
