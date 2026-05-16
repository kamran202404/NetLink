import type { Peer, LocalPeer } from '@netlink/core';
import type { CallStoreState } from './useCallStore';
import { Avatar } from '@/shared/components/Avatar';
import * as Icons from '@/shared/icons';
import { fmtDuration, shortId } from '@/lib/format';

// ── Video surface placeholder ────────────────────────────────────────────────

function VideoSurface({ peer, label, muted, videoOff, isLocal, large }: { peer: Peer | LocalPeer; label: string; muted: boolean; videoOff: boolean; isLocal?: boolean; large?: boolean }) {
  const colors = isLocal
    ? ['oklch(0.30 0.06 200)', 'oklch(0.22 0.04 240)']
    : ['oklch(0.32 0.06 30)',  'oklch(0.22 0.04 250)'];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: large ? 14 : 10, overflow: 'hidden', background: videoOff ? 'oklch(0.18 0.01 250)' : `radial-gradient(120% 80% at 30% 20%, ${colors[0]}, ${colors[1]} 65%)`, border: '1px solid var(--line)', boxShadow: large ? '0 30px 80px rgba(0,0,0,.5)' : '0 8px 30px rgba(0,0,0,.35)' }}>
      {/* Stripe overlay */}
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: videoOff ? 0 : 0.06 }}>
        <defs>
          <pattern id={`s-${peer.id}-${isLocal ? 'l' : 'r'}`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <rect width="14" height="14" fill="transparent" /><rect width="1" height="14" fill="white" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#s-${peer.id}-${isLocal ? 'l' : 'r'})`} />
      </svg>

      {videoOff ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
          <Avatar peer={peer as Peer} size="lg" showStatus={false} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-dim)', fontSize: 12 }}><Icons.VideoOff size={14} /> camera off</div>
        </div>
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: large ? 180 : 60, fontWeight: 600, color: 'rgba(255,255,255,.1)', letterSpacing: -2, userSelect: 'none' }}>
          {peer.initials}
        </div>
      )}

      {/* Name plate */}
      <div style={{ position: 'absolute', left: 10, bottom: 10, display: 'flex', alignItems: 'center', gap: 8, padding: '5px 9px 5px 6px', background: 'rgba(11,13,16,.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, fontSize: 11.5 }}>
        {muted ? <Icons.MicOff size={12} stroke="var(--warn)" /> : <Icons.Mic size={12} stroke="var(--accent)" />}
        <span style={{ fontWeight: 500 }}>{label}</span>
      </div>

      {/* Tech overlay top-right (remote only) */}
      {!isLocal && (
        <div style={{ position: 'absolute', top: 10, right: 10, padding: '4px 8px', borderRadius: 6, background: 'rgba(11,13,16,.55)', border: '1px solid rgba(255,255,255,.08)', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--accent)' }}>● HD</span>
          <span>1080p · 30fps · 3.2 Mbps</span>
        </div>
      )}
    </div>
  );
}

// ── Call control button ──────────────────────────────────────────────────────

function CallControl({ icon: Icon, label, on, onClick, danger }: { icon: React.ComponentType<any>; label: string; on?: boolean; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} title={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'transparent', border: 0, color: 'var(--text)' }}>
      <span style={{ width: 48, height: 48, borderRadius: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: danger ? 'var(--danger)' : on ? 'oklch(0.30 0.014 250)' : 'oklch(0.92 0.005 250)', color: danger ? '#fff' : on ? 'var(--text)' : '#0b0d10', border: `1px solid ${danger ? 'transparent' : 'var(--line)'}` }}>
        <Icon size={20} sw={1.8} />
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{label}</span>
    </button>
  );
}

// ── Network glyph (YOU ↔ PEER animated) ─────────────────────────────────────

function NetworkGlyph() {
  return (
    <svg width="120" height="88" viewBox="0 0 120 88">
      <defs>
        <linearGradient id="ng-line" x1="0" x2="1">
          <stop offset="0" stopColor="oklch(0.82 0.16 165)" stopOpacity="0" />
          <stop offset=".5" stopColor="oklch(0.82 0.16 165)" stopOpacity="1" />
          <stop offset="1" stopColor="oklch(0.82 0.16 165)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="44" r="14" fill="none" stroke="var(--line)" strokeWidth="1.2" />
      <circle cx="102" cy="44" r="14" fill="none" stroke="var(--line)" strokeWidth="1.2" />
      <text x="18" y="48" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill="var(--text)">YOU</text>
      <text x="102" y="48" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill="var(--text)">PEER</text>
      <line x1="32" y1="44" x2="88" y2="44" stroke="url(#ng-line)" strokeWidth="1.6" strokeDasharray="3 4">
        <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="1.2s" repeatCount="indefinite" />
      </line>
      <circle r="3" fill="var(--accent)"><animateMotion dur="1.6s" repeatCount="indefinite" path="M 32 44 L 88 44" /></circle>
      <circle r="2" fill="var(--accent)" opacity=".55"><animateMotion dur="1.6s" begin="-.5s" repeatCount="indefinite" path="M 88 44 L 32 44" /></circle>
    </svg>
  );
}

// ── Active call layout ───────────────────────────────────────────────────────

interface ActiveCallProps {
  peer: Peer;
  local: LocalPeer;
  callState: Omit<CallStoreState, 'startCall' | 'endCall' | 'toggleMute' | 'toggleVideo' | 'toggleScreenshare' | 'toggleChatPanel' | 'tick'>;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenshare: () => void;
  onToggleChatPanel: () => void;
  onEnd: () => void;
  onSendFile: () => void;
}

export function ActiveCall({ peer, local, callState, onToggleMute, onToggleVideo, onToggleScreenshare, onToggleChatPanel, onEnd, onSendFile }: ActiveCallProps) {
  const { duration, muted, videoOff, screenshare, chatPanelOpen } = callState;
  return (
    <div style={{ position: 'relative', height: '100%', display: 'grid', gridTemplateRows: '1fr auto' }}>
      {/* Stage */}
      <div style={{ position: 'relative', overflow: 'hidden', padding: 18 }}>
        <div style={{ position: 'absolute', inset: 18 }}>
          <VideoSurface peer={peer} label={peer.name} muted={false} videoOff={false} large />
        </div>
        {/* Status pill */}
        <div style={{ position: 'absolute', top: 30, left: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px 6px 8px', borderRadius: 999, background: 'rgba(11,13,16,.55)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,.08)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />
            <span style={{ fontSize: 12, fontWeight: 500 }}>{peer.name}</span>
            <span style={{ fontFamily: 'var(--mono)', color: 'var(--text-dim)', fontSize: 11 }}>· {fmtDuration(duration)}</span>
          </div>
        </div>
        {/* Tech panel */}
        <div style={{ position: 'absolute', top: 30, right: 30, background: 'rgba(11,13,16,.55)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,.08)', padding: '8px 10px', borderRadius: 8, fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--text-dim)', lineHeight: 1.6, minWidth: 200 }}>
          {[['peer', shortId(peer.id)], ['ip', `${peer.ip}:${peer.port}`], ['ice', 'host · srflx ✓'], ['rtt', `${peer.ping}ms`], ['codec', 'VP9 · Opus'], ['loss', '0.0%']].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{k}</span>
              <span style={k === 'ice' || k === 'loss' ? { color: 'var(--accent)' } : {}}>{v}</span>
            </div>
          ))}
        </div>
        {/* Local PiP */}
        <div style={{ position: 'absolute', bottom: 30, right: 30, width: 200, height: 130 }}>
          <VideoSurface peer={local as unknown as Peer} label={`You · ${local.hostname}`} muted={muted} videoOff={videoOff} isLocal />
        </div>
      </div>

      {/* Control bar */}
      <div style={{ padding: '14px 20px 18px', background: 'linear-gradient(180deg, transparent, oklch(0.16 0.012 250))', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, borderTop: '1px solid var(--line-soft)' }}>
        <CallControl icon={muted ? Icons.MicOff : Icons.Mic} label={muted ? 'Unmute' : 'Mute'} on={!muted} onClick={onToggleMute} />
        <CallControl icon={videoOff ? Icons.VideoOff : Icons.Video} label={videoOff ? 'Start video' : 'Stop video'} on={!videoOff} onClick={onToggleVideo} />
        <CallControl icon={Icons.Screen} label={screenshare ? 'Stop share' : 'Share'} on={!screenshare} onClick={onToggleScreenshare} />
        <CallControl icon={Icons.Speaker} label="Audio" on onClick={() => {}} />
        <div style={{ width: 1, height: 36, background: 'var(--line-soft)', margin: '0 6px' }} />
        <CallControl icon={Icons.Chat} label="Chat" on={chatPanelOpen} onClick={onToggleChatPanel} />
        <CallControl icon={Icons.Paperclip} label="Send file" on onClick={onSendFile} />
        <CallControl icon={Icons.More} label="More" on onClick={() => {}} />
        <div style={{ width: 1, height: 36, background: 'var(--line-soft)', margin: '0 6px' }} />
        <CallControl icon={Icons.PhoneOff} label="End" danger onClick={onEnd} />
      </div>
    </div>
  );
}

// ── No active call view ──────────────────────────────────────────────────────

function CallHistoryRow({ peer, kind, dur, when }: { peer: Peer; kind: 'in' | 'out' | 'missed'; dur: string; when: string }) {
  const colorMap = { in: 'var(--accent)', out: 'var(--text-dim)', missed: 'var(--danger)' };
  const IconMap  = { in: Icons.ArrowDown, out: Icons.ArrowUp, missed: Icons.PhoneOff };
  const Ic = IconMap[kind];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 80px 100px 32px', alignItems: 'center', gap: 10, padding: '8px 6px', borderBottom: '1px solid var(--line-soft)' }}>
      <span style={{ color: colorMap[kind] }}><Ic size={14} /></span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar peer={peer} size="sm" showStatus={false} />
        <div>
          <div style={{ fontSize: 12.5 }}>{peer.name}</div>
          <div style={{ fontFamily: 'var(--mono)', color: 'var(--text-dim)', fontSize: 10 }}>{peer.ip}</div>
        </div>
      </div>
      <div style={{ fontFamily: 'var(--mono)', color: 'var(--text-dim)', fontSize: 11, textAlign: 'right' }}>{dur}</div>
      <div style={{ color: 'var(--text-dim)', fontSize: 11.5 }}>{when}</div>
      <button style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid transparent', background: 'transparent', color: 'var(--text-dim)', marginLeft: 'auto' }}><Icons.Phone size={13} /></button>
    </div>
  );
}

export function NoActiveCall({ peers, onCall }: { peers: Peer[]; onCall: (id: string, video: boolean) => void }) {
  const callable = peers.filter((p) => p.status !== 'in-call' && !p.isService);
  return (
    <div style={{ height: '100%', padding: 24, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.2 }}>Calls</div>
          <div style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>Direct P2P over your LAN. No server, no cloud.</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 500, background: 'oklch(0.27 0.014 250)', border: '1px solid var(--line)', color: 'var(--text)' }}><Icons.Camera size={14} /> Test camera</button>
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 500, background: 'oklch(0.27 0.014 250)', border: '1px solid var(--line)', color: 'var(--text)' }}><Icons.Mic size={14} /> Test mic</button>
        </div>
      </div>

      <div style={{ border: '1px dashed var(--line)', borderRadius: 14, padding: 28, background: 'linear-gradient(180deg, oklch(0.22 0.012 250), oklch(0.20 0.012 250))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <NetworkGlyph />
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>No active call</div>
            <div style={{ color: 'var(--text-dim)', fontSize: 13, maxWidth: 520, lineHeight: 1.55, marginTop: 6 }}>
              When you call a peer, ICE candidates are exchanged over a tiny local WebSocket; once handshake completes the call goes direct between your machines.
            </div>
          </div>
        </div>
      </div>

      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-mute)', marginTop: 4 }}>Quick call</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
        {callable.map((p) => (
          <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--line-soft)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar peer={p} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                  <div style={{ fontFamily: 'var(--mono)', color: 'var(--text-dim)', fontSize: 10 }}>{p.ip} · {p.ping}ms</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
              <button onClick={() => onCall(p.id, true)} style={{ flex: 1, justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 7, fontSize: 11.5, fontWeight: 600, background: 'var(--accent)', border: '1px solid transparent', color: '#0b0d10' }}><Icons.Video size={14} /> Video</button>
              <button onClick={() => onCall(p.id, false)} style={{ flex: 1, justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 7, fontSize: 11.5, fontWeight: 500, background: 'oklch(0.27 0.014 250)', border: '1px solid var(--line)', color: 'var(--text)' }}><Icons.Phone size={14} /> Voice</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-mute)', marginTop: 8 }}>Recent</div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <CallHistoryRow peer={peers[1]!} kind="out"    dur="42:18" when="Today, 09:21" />
        <CallHistoryRow peer={peers[0]!} kind="in"     dur="08:02" when="Today, 10:16" />
        <CallHistoryRow peer={peers[2]!} kind="missed" dur="—"     when="Yesterday"   />
      </div>
    </div>
  );
}

// Public view component — chooses between active/idle based on store state
export function CallsView({ peers, local, callState, onCall, onToggleMute, onToggleVideo, onToggleScreenshare, onToggleChatPanel, onEnd, onSendFile }: {
  peers: Peer[];
  local: LocalPeer;
  callState: CallStoreState;
  onCall: (id: string, video: boolean) => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenshare: () => void;
  onToggleChatPanel: () => void;
  onEnd: () => void;
  onSendFile: () => void;
}) {
  if (!callState.inCall) {
    return <NoActiveCall peers={peers} onCall={onCall} />;
  }
  const peer = peers.find((p) => p.id === callState.inCall);
  if (!peer) return null;
  return <ActiveCall peer={peer} local={local} callState={callState} onToggleMute={onToggleMute} onToggleVideo={onToggleVideo} onToggleScreenshare={onToggleScreenshare} onToggleChatPanel={onToggleChatPanel} onEnd={onEnd} onSendFile={onSendFile} />;
}
