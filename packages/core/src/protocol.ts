// DataChannel control message protocol.
// All control channel messages are variants of this union.
// Add new message types here — the compiler will catch any unhandled switch cases.

export type ControlMessage =
  | {
      type: 'FILE_OFFER';
      transferId: string;
      name: string;
      size: number;
      totalChunks: number;
      chunkSize: number;
      sha256: string;
    }
  | { type: 'FILE_ACCEPT';   transferId: string }
  | { type: 'FILE_DECLINE';  transferId: string }
  | { type: 'FILE_NACK';     transferId: string; chunkIndex: number }
  | { type: 'FILE_COMPLETE'; transferId: string }
  | { type: 'FILE_CANCEL';   transferId: string }
  | { type: 'CHAT_DELIVERED'; id: string }
  | { type: 'CHAT_READ';      id: string };

export type ChatMessage = {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
};

export function parseControlMessage(raw: string): ControlMessage {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
    throw new Error(`Invalid control message: ${raw}`);
  }
  return parsed as ControlMessage;
}

// Use this in switch default to get compile-time exhaustiveness checking:
//   default: assertNever(msg);
export function assertNever(x: never): never {
  throw new Error(`Unhandled message type: ${JSON.stringify(x)}`);
}
