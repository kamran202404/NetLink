// Shared domain types used across packages/core and the desktop app.
// No Tauri, React, or browser-specific imports allowed in this file.

export interface Peer {
  id: string;
  name: string;
  hostname: string;
  ip: string;
  port: number;
  os?: string;
  initials: string;
  color: string;
  status: 'online' | 'idle' | 'in-call' | 'offline';
  signal: 1 | 2 | 3 | 4;
  ping: number;
  lastSeen: string;
  unread: number;
  isService?: boolean;
}

export interface Message {
  id: string;
  peerId: string;
  senderId: string;
  text: string;
  timestamp: number;
  state: 'sent' | 'delivered' | 'read';
  attachment?: FileAttachment;
}

export interface FileAttachment {
  name: string;
  size: string;
  kind: string;
}

export type TransferDirection = 'in' | 'out';
export type TransferState = 'offered' | 'transferring' | 'complete' | 'failed' | 'paused';

export interface Transfer {
  id: string;
  name: string;
  size: number;
  sent: number;          // 0–1 fraction
  direction: TransferDirection;
  peerId: string;
  speed: number;         // MB/s
  chunks: { total: number; done: number; inflight: number };
  sha256: string;
  state: TransferState;
  eta: number;           // seconds remaining
}

export interface LocalPeer {
  id: string;
  name: string;
  hostname: string;
  ip: string;
  port: number;
  os?: string;
  initials: string;
  color: string;
}
