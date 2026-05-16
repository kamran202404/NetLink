import { useState } from 'react';
import type { Peer, LocalPeer } from '@netlink/core';
import { Avatar } from '@/shared/components/Avatar';
import * as Icons from '@/shared/icons';

function SigBars({ n }: { n: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2, alignItems: 'flex-end', height: 12 }}>
      {[1, 2, 3, 4].map((b) => (
        <span key={b} style={{ width: 3, height: 3 + b * 2.2, borderRadius: 1, background: b <= n ? 'var(--accent)' : 'oklch(0.36 0.01 250)' }} />
      ))}
    </span>
  );
}

function PeerRow({ peer, active, onSelect, onCall }: { peer: Peer; active: boolean; onSelect: () => void; onCall: () => void }) {
  return (
    <div
      onClick={onSelect}
      style={{
        display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 10,
        padding: '9px 10px', borderRadius: 8, cursor: 'default',
        background: active ? 'oklch(0.27 0.018 250)' : 'transparent',
        border: `1px solid ${active ? 'var(--line)' : 'transparent'}`,
      }}
    >
      <Avatar peer={peer} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{peer.name}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-mute)', flexShrink: 0 }}>{peer.lastSeen}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--text-mute)', marginTop: 2 }}>
          <SigBars n={peer.signal} />
          <span>{peer.ip}</span>
          {peer.status === 'in-call' && <span style={{ color: 'var(--warn)' }}>· in call</span>}
        </div>
      </div>
      {peer.unread > 0 ? (
        <span style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: 'var(--accent)', color: '#0b0d10', fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{peer.unread}</span>
      ) : (
        <button title="Call" onClick={(e) => { e.stopPropagation(); onCall(); }}
          style={{ width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid transparent', background: 'transparent', color: 'var(--text-dim)' }}>
          <Icons.Phone size={14} />
        </button>
      )}
    </div>
  );
}

interface PeerListProps {
  peers: Peer[];
  local: LocalPeer;
  activePeerId: string | null;
  onSelect: (id: string) => void;
  onCall: (id: string) => void;
}

export function PeerList({ peers, local, activePeerId, onSelect, onCall }: PeerListProps) {
  const [query, setQuery] = useState('');

  const filtered = peers.filter((p) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.hostname.toLowerCase().includes(q) || p.ip.includes(q);
  });
  const online = filtered.filter((p) => p.status !== 'idle' && p.status !== 'offline');
  const idle   = filtered.filter((p) => p.status === 'idle');

  return (
    <aside style={{ borderRight: '1px solid var(--line)', background: 'oklch(0.19 0.012 250)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Me card */}
      <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--line-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar peer={{ ...local, status: 'online' } as Peer} showStatus={false} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{local.name}</div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent)' }}>● online</span>
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-mute)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {local.hostname} · {local.ip}:{local.port}
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '10px 12px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-2)', border: '1px solid var(--line-soft)', borderRadius: 8, padding: '6px 10px' }}>
          <Icons.Search size={14} stroke="var(--text-mute)" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search peers, IPs…"
            style={{ flex: 1, background: 'transparent', border: 0, outline: 0, color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 12.5 }} />
          {query && <button onClick={() => setQuery('')} style={{ width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 0, background: 'transparent', color: 'var(--text-dim)' }}><Icons.X size={12} /></button>}
        </div>
      </div>

      {/* Discovery banner */}
      <div style={{ padding: '4px 14px 10px', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-mute)' }}>
        <span>discovering · _p2pchat._tcp.local</span>
        <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--accent)', animation: 'pulse 1.6s ease-out infinite' }} />
          {peers.length} found
        </span>
      </div>

      {/* Peer list */}
      <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 8px 12px' }}>
        <div style={{ padding: '4px 6px', fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-mute)' }}>On the network</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {online.map((p) => <PeerRow key={p.id} peer={p} active={p.id === activePeerId} onSelect={() => onSelect(p.id)} onCall={() => onCall(p.id)} />)}
        </div>
        {idle.length > 0 && (
          <>
            <div style={{ padding: '12px 6px 4px', fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-mute)' }}>Idle</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, opacity: 0.78 }}>
              {idle.map((p) => <PeerRow key={p.id} peer={p} active={p.id === activePeerId} onSelect={() => onSelect(p.id)} onCall={() => onCall(p.id)} />)}
            </div>
          </>
        )}
        {filtered.length === 0 && (
          query
            ? <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--text-mute)', fontSize: 12 }}>No peers match &ldquo;{query}&rdquo;.</div>
            : (
              <div style={{ padding: '32px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: 'var(--text-mute)', textAlign: 'center' }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--accent)', animation: 'pulse 1.6s ease-out infinite', display: 'inline-block' }} />
                <div style={{ fontSize: 12, fontWeight: 500 }}>Scanning for peers…</div>
                <div style={{ fontSize: 11, lineHeight: 1.6 }}>Open NetLink on another machine on this LAN.</div>
              </div>
            )
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--line-soft)', padding: '8px 14px', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-mute)' }}>
          <Icons.Lock size={11} /> direct · no relay
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-mute)' }}>
          <Icons.Wifi size={11} stroke="var(--accent)" /> studio-wifi
        </div>
      </div>
    </aside>
  );
}
