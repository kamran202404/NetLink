import { useEffect, useRef, useState } from 'react';
import type { Message, Peer } from '@netlink/core';
import { Avatar } from '@/shared/components/Avatar';
import * as Icons from '@/shared/icons';

function TypingDot({ delay }: { delay: number }) {
  return <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--text-dim)', animation: `bounce 1s ease-in-out ${delay}s infinite` }} />;
}

function FileAttachmentBubble({ a, mine }: { a: NonNullable<Message['attachment']>; mine: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, borderTopRightRadius: mine ? 4 : 12, borderTopLeftRadius: mine ? 12 : 4, background: 'oklch(0.26 0.012 250)', border: '1px solid var(--line-soft)' }}>
      <span style={{ width: 38, height: 38, borderRadius: 8, background: 'oklch(0.22 0.04 30)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icons.FileText size={18} />
      </span>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{a.name}</div>
        <div style={{ fontFamily: 'var(--mono)', color: 'var(--text-dim)', fontSize: 11 }}>{a.size} · SHA-256 verified</div>
      </div>
      <button style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 7, fontSize: 11.5, fontWeight: 500, background: 'oklch(0.27 0.014 250)', border: '1px solid var(--line)', color: 'var(--text)' }}>
        <Icons.Download size={12} /> Save
      </button>
    </div>
  );
}

function MessageBubble({ msg, peer }: { msg: Message; peer: Peer }) {
  const mine = msg.senderId === 'me';
  return (
    <div style={{ display: 'flex', flexDirection: mine ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
      {!mine && <Avatar peer={peer} size="sm" showStatus={false} />}
      <div style={{ maxWidth: 'min(64ch, 70%)' }}>
        {msg.attachment ? (
          <FileAttachmentBubble a={msg.attachment} mine={mine} />
        ) : (
          <div style={{ padding: '8px 12px', borderRadius: 12, borderTopRightRadius: mine ? 4 : 12, borderTopLeftRadius: mine ? 12 : 4, background: mine ? 'var(--accent)' : 'oklch(0.26 0.012 250)', color: mine ? '#0b0d10' : 'var(--text)', fontSize: 13.5, lineHeight: 1.5 }}>
            {msg.text}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', gap: 6, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-mute)', marginTop: 4 }}>
          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {mine && (
            <span style={{ color: msg.state === 'read' ? 'var(--accent)' : 'var(--text-mute)' }}>
              {msg.state === 'read' ? '✓✓ read' : msg.state === 'delivered' ? '✓✓ delivered' : '✓ sent'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface ChatsViewProps {
  peer: Peer;
  messages: Message[];
  onSend: (text: string) => void;
  onCall: () => void;
  onVideo: () => void;
  embedded?: boolean;
  showTech?: boolean;
}

export function ChatsView({ peer, messages, onSend, onCall, onVideo, embedded = false, showTech = true }: ChatsViewProps) {
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, peer.id]);

  const submit = () => { if (text.trim()) { onSend(text.trim()); setText(''); } };

  return (
    <div style={{ display: 'grid', gridTemplateRows: embedded ? 'auto 1fr auto' : 'auto 1fr auto auto', height: '100%', minHeight: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: embedded ? '10px 12px' : '12px 18px', borderBottom: '1px solid var(--line-soft)', background: embedded ? 'transparent' : 'oklch(0.20 0.012 250)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar peer={peer} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{peer.name}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: peer.status === 'in-call' ? 'var(--warn)' : 'var(--accent)' }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: 'currentColor' }} />
                {peer.status === 'in-call' ? 'in another call' : 'connected · direct'}
              </span>
            </div>
            <div style={{ fontFamily: 'var(--mono)', color: 'var(--text-dim)', fontSize: 10.5, marginTop: 1 }}>
              {peer.hostname} · {peer.ip}:{peer.port} · rtt {peer.ping}ms
            </div>
          </div>
        </div>
        {!embedded && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {[{ icon: Icons.Phone, title: 'Voice call', action: onCall }, { icon: Icons.Video, title: 'Video call', action: onVideo }, { icon: Icons.Paperclip, title: 'Send file', action: () => {} }].map(({ icon: Icon, title, action }) => (
              <button key={title} title={title} onClick={action} style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid transparent', background: 'transparent', color: 'var(--text-dim)' }}><Icon size={15} /></button>
            ))}
            <div style={{ width: 1, height: 18, background: 'var(--line-soft)', margin: '0 4px' }} />
            <button title="More" style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid transparent', background: 'transparent', color: 'var(--text-dim)' }}><Icons.More size={15} /></button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="scroll" style={{ overflowY: 'auto', padding: embedded ? '14px 12px' : '18px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ alignSelf: 'center', fontSize: 10.5, color: 'var(--text-mute)', padding: '3px 10px', borderRadius: 999, border: '1px solid var(--line-soft)', background: 'var(--bg-2)' }}>Today</div>
        {showTech && (
          <div style={{ alignSelf: 'center', padding: '6px 10px', border: '1px dashed var(--line)', borderRadius: 8, fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--text-mute)', display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <span style={{ color: 'var(--accent)' }}>●</span>
            DataChannel "chat" open · ordered, reliable · 64KB MTU
          </div>
        )}
        {messages.map((m) => <MessageBubble key={m.id} msg={m} peer={peer} />)}
        {/* Typing indicator — wired in Phase E when DataChannel is live */}
      </div>

      {/* Input */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--line-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: '6px 8px' }}>
          <button style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid transparent', background: 'transparent', color: 'var(--text-dim)' }}><Icons.Paperclip size={16} /></button>
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder={`Message ${peer.name}…`}
            style={{ flex: 1, background: 'transparent', border: 0, outline: 0, color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 13.5, padding: '6px 4px' }} />
          <button onClick={submit} style={{ opacity: text.trim() ? 1 : 0.45, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 7, fontSize: 11.5, fontWeight: 600, background: 'var(--accent)', border: '1px solid transparent', color: '#0b0d10' }}>
            <Icons.Send size={13} /> Send
          </button>
        </div>
      </div>

      {/* Tech footer */}
      {!embedded && showTech && (
        <div style={{ padding: '6px 18px 10px', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-mute)', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line-soft)', background: 'var(--bg-2)' }}>
          <span>e2e: WebRTC SRTP · DTLS-SRTP fingerprint matches</span>
          <span>chat DataChannel · {messages.length} msgs · last ack 0.4s ago</span>
        </div>
      )}
    </div>
  );
}
