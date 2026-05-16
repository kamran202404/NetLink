import type { Peer } from '@netlink/core';
import { Avatar } from '@/shared/components/Avatar';
import * as Icons from '@/shared/icons';

function CallControl({ icon: Icon, label, danger, onClick }: { icon: React.ComponentType<any>; label: string; danger?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'transparent', border: 0, color: 'var(--text)' }}>
      <span style={{ width: 48, height: 48, borderRadius: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: danger ? 'var(--danger)' : 'oklch(0.27 0.014 250)', color: danger ? '#fff' : 'var(--text)', border: `1px solid ${danger ? 'transparent' : 'var(--line)'}` }}>
        <Icon size={20} sw={1.8} />
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{label}</span>
    </button>
  );
}

interface IncomingCallModalProps {
  peer: Peer;
  onAccept: (video: boolean) => void;
  onDecline: () => void;
}

export function IncomingCallModal({ peer, onAccept, onDecline }: IncomingCallModalProps) {
  return (
    <div onClick={onDecline} style={{ position: 'fixed', inset: 0, background: 'rgba(8,10,12,.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn .15s ease-out' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 420, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,.55)', animation: 'modalIn .2s cubic-bezier(.2,.7,.2,1)' }}>
        {/* Avatar + identity */}
        <div style={{ padding: '28px 22px 20px', textAlign: 'center', background: 'radial-gradient(120% 80% at 50% 0%, oklch(0.30 0.06 165 / .35), transparent 60%)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 84, height: 84, borderRadius: 42, background: 'oklch(0.27 0.014 250)', border: '1px solid var(--line)', position: 'relative', marginBottom: 14 }}>
            {/* Pulsing rings */}
            <span style={{ position: 'absolute', inset: -6, borderRadius: 48, border: '2px solid var(--accent)', opacity: 0.4, animation: 'ring 1.6s ease-out infinite' }} />
            <span style={{ position: 'absolute', inset: -14, borderRadius: 54, border: '2px solid var(--accent)', opacity: 0.2, animation: 'ring 1.6s ease-out .4s infinite' }} />
            <Avatar peer={peer} size="lg" showStatus={false} />
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>incoming video call</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{peer.name}</div>
          <div style={{ fontFamily: 'var(--mono)', color: 'var(--text-dim)', fontSize: 11, marginTop: 4 }}>
            {peer.hostname} · {peer.ip}:{peer.port}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 30, padding: '18px 22px 24px', borderTop: '1px solid var(--line-soft)' }}>
          <CallControl icon={Icons.PhoneOff} label="Decline" danger onClick={onDecline} />
          <CallControl icon={Icons.Mic}      label="Audio"         onClick={() => onAccept(false)} />
          <CallControl icon={Icons.Video}    label="Accept"        onClick={() => onAccept(true)} />
        </div>
      </div>
    </div>
  );
}
