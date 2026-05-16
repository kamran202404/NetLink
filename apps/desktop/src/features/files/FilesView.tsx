import { useRef, useState } from 'react';
import type { Transfer, Peer } from '@netlink/core';
import * as Icons from '@/shared/icons';
import { fmtBytes, fmtEta } from '@/lib/format';

function Stat({ label, value, accent, warn }: { label: string; value: string | number; accent?: boolean; warn?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-mute)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 600, letterSpacing: -0.5, color: accent ? 'var(--accent)' : warn ? 'var(--warn)' : 'var(--text)' }}>{value}</div>
    </div>
  );
}

function TransferRow({ t, peers, onAccept, onDecline, onCancel, onPause }: { t: Transfer; peers: Peer[]; onAccept?: () => void; onDecline?: () => void; onCancel?: () => void; onPause?: () => void }) {
  const peer = peers.find((p) => p.id === t.peerId);
  const pct = Math.round(t.sent * 100);
  const isComplete = t.state === 'complete';
  const isOffered  = t.state === 'offered';
  const stateColor = isComplete ? 'var(--accent)' : isOffered ? 'var(--warn)' : 'var(--accent)';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 200px 160px', gap: 14, alignItems: 'center', padding: '14px 16px', borderRadius: 12, background: isOffered ? 'oklch(0.22 0.04 75 / 0.4)' : 'var(--surface)', border: `1px solid ${isOffered ? 'oklch(0.42 0.10 75)' : 'var(--line-soft)'}` }}>
      <span style={{ width: 36, height: 36, borderRadius: 8, background: 'oklch(0.25 0.02 250)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: stateColor }}>
        {t.direction === 'in' ? <Icons.Download size={17} /> : <Icons.Upload size={17} />}
      </span>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: 13.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
          <span style={{ fontFamily: 'var(--mono)', color: 'var(--text-dim)', fontSize: 10.5, flexShrink: 0 }}>{fmtBytes(t.size)}</span>
          {isOffered  && <span style={{ padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, background: 'oklch(0.42 0.12 75)', color: '#0b0d10', letterSpacing: '.04em', flexShrink: 0 }}>INCOMING OFFER</span>}
          {isComplete && <span style={{ padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, background: 'oklch(0.30 0.08 165)', color: 'var(--accent)', flexShrink: 0 }}>✓ COMPLETE</span>}
        </div>
        {!isOffered && (
          <div style={{ position: 'relative', height: 6, background: 'oklch(0.20 0.012 250)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${pct}%`, background: `linear-gradient(90deg, ${stateColor}, oklch(0.78 0.13 175))`, transition: 'width .3s' }} />
            {!isComplete && t.chunks.inflight > 0 && (
              <div style={{ position: 'absolute', left: `${pct}%`, top: 0, bottom: 0, width: 36, background: 'linear-gradient(90deg, oklch(0.78 0.13 175 / .6), transparent)', animation: 'slide 1.1s linear infinite' }} />
            )}
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--text-mute)' }}>
          {peer && <span>from {peer.name}</span>}
          <span>SHA-256 <span style={{ color: 'var(--text-dim)' }}>{t.sha256}</span></span>
          {!isComplete && !isOffered && <><span>chunk {t.chunks.done.toLocaleString()}/{t.chunks.total.toLocaleString()}</span><span>{t.chunks.inflight} in-flight</span></>}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)' }}>
        {isOffered  ? <><div>offered just now</div><div style={{ color: 'var(--text-mute)' }}>awaiting your decision…</div></> :
         isComplete ? <><div style={{ color: 'var(--accent)' }}>verified · {fmtBytes(t.size)}</div><div style={{ color: 'var(--text-mute)' }}>saved to ~/NetLink/Received</div></> :
                      <><div style={{ color: 'var(--text)' }}>{t.speed.toFixed(1)} MB/s · {pct}%</div><div style={{ color: 'var(--text-mute)' }}>eta {fmtEta(t.eta)} · {fmtBytes(t.size * (1 - t.sent))} left</div></>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        {isOffered && <>
          <button onClick={onAccept} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 7, fontSize: 11.5, fontWeight: 600, background: 'var(--accent)', border: 'transparent', color: '#0b0d10' }}><Icons.Check size={13} /> Accept</button>
          <button onClick={onDecline} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 7, fontSize: 11.5, fontWeight: 500, background: 'oklch(0.27 0.014 250)', border: '1px solid var(--line)', color: 'var(--text)' }}><Icons.X size={13} /> Decline</button>
        </>}
        {!isOffered && !isComplete && <>
          <button onClick={onPause} title="Pause" style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid transparent', background: 'transparent', color: 'var(--text-dim)' }}><Icons.Pause size={14} /></button>
          <button onClick={onCancel} title="Cancel" style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid transparent', background: 'transparent', color: 'var(--text-dim)' }}><Icons.X size={14} /></button>
        </>}
        {isComplete && <>
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 7, fontSize: 11.5, fontWeight: 500, background: 'oklch(0.27 0.014 250)', border: '1px solid var(--line)', color: 'var(--text)' }}><Icons.Folder size={13} /> Reveal</button>
          <button style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid transparent', background: 'transparent', color: 'var(--text-dim)' }}><Icons.More size={14} /></button>
        </>}
      </div>
    </div>
  );
}

type Filter = 'all' | 'active' | 'incoming' | 'outgoing' | 'complete';
const FILTERS: [Filter, string][] = [['all','All'],['active','Active'],['incoming','Incoming'],['outgoing','Outgoing'],['complete','Done']];

interface FilesViewProps {
  transfers: Transfer[];
  peers: Peer[];
  activePeerId?: string | null;
  onAction: (id: string, action: string) => void;
  onSendFile?: (peerId: string, file: File) => void;
}

export function FilesView({ transfers, peers, activePeerId, onAction, onSendFile }: FilesViewProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activePeerId) onSendFile?.(activePeerId, file);
    e.target.value = '';
  };
  const offered = transfers.filter((t) => t.state === 'offered');
  const active  = transfers.filter((t) => t.state === 'transferring');
  const done    = transfers.filter((t) => t.state === 'complete');
  const totalSpeed = active.reduce((s, t) => s + t.speed, 0);

  const matches = (t: Transfer) =>
    filter === 'all'      ? true :
    filter === 'active'   ? t.state === 'transferring' :
    filter === 'incoming' ? t.direction === 'in' :
    filter === 'outgoing' ? t.direction === 'out' :
    filter === 'complete' ? t.state === 'complete' : false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ padding: '18px 22px 12px', borderBottom: '1px solid var(--line-soft)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.2 }}>Files</div>
            <div style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 3 }}>Chunked over a dedicated DataChannel. 64KB chunks, 8-frame window, SHA-256 verified.</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileSelected} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!activePeerId}
              title={activePeerId ? 'Send file to selected peer' : 'Select a peer first'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, background: activePeerId ? 'var(--accent)' : 'oklch(0.27 0.014 250)', border: '1px solid transparent', color: activePeerId ? '#0b0d10' : 'var(--text-mute)', cursor: activePeerId ? 'pointer' : 'not-allowed' }}
            >
              <Icons.Plus size={14} /> Send file…
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 14, fontFamily: 'var(--mono)' }}>
          <Stat label="active"          value={active.length} />
          <Stat label="throughput"      value={`${totalSpeed.toFixed(1)} MB/s`} accent />
          <Stat label="completed today" value={done.length} />
          <Stat label="offered"         value={offered.length} warn={offered.length > 0} />
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 2, background: 'var(--surface)', border: '1px solid var(--line-soft)', borderRadius: 8, padding: 2 }}>
            {FILTERS.map(([k, label]) => (
              <button key={k} onClick={() => setFilter(k)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 500, background: filter === k ? 'oklch(0.28 0.014 250)' : 'transparent', border: `1px solid ${filter === k ? 'var(--line)' : 'transparent'}`, color: 'var(--text)' }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 22px 22px', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {offered.length > 0 && (
          <>
            <div style={{ margin: '4px 4px 8px', fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-mute)' }}>Awaiting your decision</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {offered.map((t) => <TransferRow key={t.id} t={t} peers={peers} onAccept={() => onAction(t.id, 'accept')} onDecline={() => onAction(t.id, 'decline')} />)}
            </div>
          </>
        )}
        {active.filter(matches).length > 0 && (
          <>
            <div style={{ margin: '18px 4px 8px', fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-mute)' }}>In progress</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {active.filter(matches).map((t) => <TransferRow key={t.id} t={t} peers={peers} onPause={() => onAction(t.id, 'pause')} onCancel={() => onAction(t.id, 'cancel')} />)}
            </div>
          </>
        )}
        {done.filter(matches).length > 0 && (
          <>
            <div style={{ margin: '18px 4px 8px', fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-mute)' }}>Completed</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {done.filter(matches).map((t) => <TransferRow key={t.id} t={t} peers={peers} />)}
            </div>
          </>
        )}
        <div style={{ marginTop: 22, padding: 22, borderRadius: 14, border: '1.5px dashed var(--line)', background: 'linear-gradient(180deg, oklch(0.20 0.012 250), oklch(0.18 0.012 250))', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-dim)' }}>
            <Icons.Upload size={16} stroke="var(--text-dim)" /> Drop files here to send. They never leave the LAN.
          </div>
          <div style={{ fontFamily: 'var(--mono)', color: 'var(--text-dim)', fontSize: 10.5, marginTop: 6 }}>transfers are chunked and resumable · paused transfers persist across reconnect</div>
        </div>
      </div>
    </div>
  );
}
