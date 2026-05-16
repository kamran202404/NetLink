import { Server } from '@/shared/icons';
import type { Peer, LocalPeer } from '@netlink/core';

type AvatarSize = 'sm' | 'md' | 'lg';

const sizeMap: Record<AvatarSize, { px: number; font: number; iconSize: number }> = {
  sm: { px: 26, font: 10.5, iconSize: 13 },
  md: { px: 34, font: 12,   iconSize: 16 },
  lg: { px: 56, font: 18,   iconSize: 22 },
};

type StatusDot = 'online' | 'idle' | 'in-call' | 'offline' | 'none';

const dotColor: Record<Exclude<StatusDot, 'none'>, string> = {
  online:  'var(--accent)',
  idle:    'var(--text-mute)',
  'in-call': 'var(--warn)',
  offline: 'var(--text-mute)',
};

interface AvatarProps {
  peer: Peer | LocalPeer;
  size?: AvatarSize;
  showStatus?: boolean;
}

export function Avatar({ peer, size = 'md', showStatus = true }: AvatarProps) {
  const { px, font, iconSize } = sizeMap[size];
  const status: StatusDot = showStatus && 'status' in peer ? (peer as Peer).status : 'none';

  return (
    <span
      style={{
        width: px,
        height: px,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        font: `600 ${font}px/1 var(--sans)`,
        color: '#0b0d10',
        flexShrink: 0,
        position: 'relative',
        background: peer.color,
      }}
    >
      {(peer as Peer).isService
        ? <Server size={iconSize} stroke="#0b0d10" sw={2} />
        : peer.initials}

      {status !== 'none' && (
        <i
          style={{
            position: 'absolute',
            right: -1,
            bottom: -1,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: dotColor[status],
            border: '2px solid var(--bg)',
          }}
        />
      )}
    </span>
  );
}
