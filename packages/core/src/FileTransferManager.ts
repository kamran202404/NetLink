import type { FileChunkMessage } from './protocol.js';

export const CHUNK_SIZE = 64 * 1024; // 64 KB
const WINDOW_SIZE = 8;
const MB = 1024 * 1024;

// ── Base64 / SHA-256 helpers ──────────────────────────────────────────────────

export function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const CHUNK = 8192; // safe spread size
  for (let i = 0; i < bytes.byteLength; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Sender ────────────────────────────────────────────────────────────────────

type ProgressCb = (fraction: number, speedMBs: number, eta: number, done: number) => void;

export class FileSender {
  private cancelled = false;

  constructor(
    private readonly transferId: string,
    private readonly buffer: ArrayBuffer,
    private readonly onChunk: (chunk: FileChunkMessage) => void,
    private readonly onProgress: ProgressCb,
    private readonly onDone: () => void,
  ) {}

  async start(): Promise<void> {
    const total = Math.ceil(this.buffer.byteLength / CHUNK_SIZE);
    const t0    = Date.now();
    let sent    = 0;

    for (let i = 0; i < total; i++) {
      if (this.cancelled) return;
      const start = i * CHUNK_SIZE;
      const end   = Math.min(start + CHUNK_SIZE, this.buffer.byteLength);
      this.onChunk({
        transferId: this.transferId,
        index: i,
        data: arrayBufferToBase64(this.buffer.slice(start, end)),
      });
      sent += (end - start);

      // Progress update + event-loop yield every WINDOW_SIZE chunks
      if (i % WINDOW_SIZE === WINDOW_SIZE - 1 || i === total - 1) {
        const elapsed = (Date.now() - t0) / 1000;
        const speed   = elapsed > 0 ? sent / elapsed / MB : 0;
        const rem     = this.buffer.byteLength - sent;
        const eta     = speed > 0 ? rem / (speed * MB) : 0;
        this.onProgress(sent / this.buffer.byteLength, speed, eta, i + 1);
        await new Promise<void>((res) => setTimeout(res, 0));
      }
    }

    if (!this.cancelled) this.onDone();
  }

  cancel(): void { this.cancelled = true; }
}

// ── Receiver ──────────────────────────────────────────────────────────────────

export class FileReceiver {
  private readonly chunks = new Map<number, ArrayBuffer>();
  private received  = 0;
  private bytesRcv  = 0;
  private readonly t0 = Date.now();

  constructor(
    private readonly transferId: string,
    private readonly meta: { totalChunks: number; totalSize: number; sha256: string },
    private readonly onProgress: ProgressCb,
    private readonly onComplete: (assembled: ArrayBuffer) => void,
    private readonly onError: (err: string) => void,
  ) {}

  addChunk(chunk: FileChunkMessage): void {
    if (this.chunks.has(chunk.index)) return; // deduplicate
    const data = base64ToArrayBuffer(chunk.data);
    this.chunks.set(chunk.index, data);
    this.received++;
    this.bytesRcv += data.byteLength;

    const elapsed = (Date.now() - this.t0) / 1000;
    const speed   = elapsed > 0 ? this.bytesRcv / elapsed / MB : 0;
    const rem     = this.meta.totalSize - this.bytesRcv;
    const eta     = speed > 0 ? rem / (speed * MB) : 0;
    this.onProgress(this.bytesRcv / this.meta.totalSize, speed, eta, this.received);
  }

  async finalize(): Promise<void> {
    // Reassemble in order
    let totalBytes = 0;
    for (let i = 0; i < this.meta.totalChunks; i++) {
      const c = this.chunks.get(i);
      if (!c) { this.onError(`Missing chunk ${i}`); return; }
      totalBytes += c.byteLength;
    }
    const assembled = new Uint8Array(totalBytes);
    let off = 0;
    for (let i = 0; i < this.meta.totalChunks; i++) {
      assembled.set(new Uint8Array(this.chunks.get(i)!), off);
      off += this.chunks.get(i)!.byteLength;
    }

    // Verify SHA-256
    const hash = await sha256Hex(assembled.buffer);
    if (hash !== this.meta.sha256) {
      this.onError(`SHA-256 mismatch: expected ${this.meta.sha256}, got ${hash}`);
      return;
    }

    this.onComplete(assembled.buffer);
  }
}
