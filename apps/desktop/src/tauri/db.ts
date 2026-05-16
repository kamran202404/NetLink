import Database from '@tauri-apps/plugin-sql';
import type { Message } from '@netlink/core';

let db: Database | null = null;

interface DbRow {
  id: string;
  peer_id: string;
  sender_id: string;
  text: string;
  timestamp: number;
  state: string;
}

export async function initDb(): Promise<void> {
  db = await Database.load('sqlite:netlink.db');
  await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id        TEXT    PRIMARY KEY,
      peer_id   TEXT    NOT NULL,
      sender_id TEXT    NOT NULL,
      text      TEXT    NOT NULL,
      timestamp INTEGER NOT NULL,
      state     TEXT    NOT NULL
    )
  `);
}

export async function saveMessage(msg: Message): Promise<void> {
  if (!db) return;
  await db.execute(
    'INSERT OR REPLACE INTO messages (id, peer_id, sender_id, text, timestamp, state) VALUES (?, ?, ?, ?, ?, ?)',
    [msg.id, msg.peerId, msg.senderId, msg.text, msg.timestamp, msg.state],
  );
}

export async function loadMessages(peerId: string): Promise<Message[]> {
  if (!db) return [];
  const rows = await db.select<DbRow[]>(
    'SELECT * FROM messages WHERE peer_id = ? ORDER BY timestamp ASC',
    [peerId],
  );
  return rows.map((r) => ({
    id: r.id,
    peerId: r.peer_id,
    senderId: r.sender_id,
    text: r.text,
    timestamp: r.timestamp,
    state: r.state as Message['state'],
  }));
}

export async function updateMessageState(id: string, state: Message['state']): Promise<void> {
  if (!db) return;
  await db.execute('UPDATE messages SET state = ? WHERE id = ?', [state, id]);
}

export async function clearAllMessages(): Promise<void> {
  if (!db) return;
  await db.execute('DELETE FROM messages');
}
