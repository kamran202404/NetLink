import { useCallback, useEffect, useRef, useState } from 'react';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { usePeerStore }     from '@/features/peers/usePeerStore';
import { useCallStore }     from '@/features/calls/useCallStore';
import { useChatStore }     from '@/features/chats/useChatStore';
import { useFileStore }     from '@/features/files';
import { PeerList }         from '@/features/peers/PeerList';
import { ChatsView }        from '@/features/chats/ChatsView';
import { CallsView }        from '@/features/calls/CallsView';
import { FilesView }        from '@/features/files/FilesView';
import { SettingsModal }    from '@/features/settings/SettingsModal';
import { IncomingCallModal } from '@/features/calls/IncomingCallModal';
import { ToastStack }        from '@/shared/components/Toast';
import { toast }             from '@/shared/toastStore';
import { useTauriEvent }    from '@/tauri/events';
import type { TauriEvents } from '@/tauri/events';
import { usePeerConnections } from '@/features/calls/usePeerConnections';
import * as Icons from '@/shared/icons';
import { fmtDuration }      from '@/lib/format';
import { initialsFromName, colorFromId } from '@/lib/peers';
import type { Peer }        from '@netlink/core';

type Tab = 'calls' | 'chats' | 'files';

export function App() {
  const { local, theme, selectedCameraId, selectedMicId, setDisplayName, setTheme, setCamera, setMic } = useSettingsStore();

  // Load real identity from backend; init chat + file DataChannel handlers + SQLite.
  useEffect(() => {
    useSettingsStore.getState().init().catch(console.error);
    useChatStore.getState().init();
    useFileStore.getState().init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Peer discovery — wire Tauri events to the peer store
  const handlePeerDiscovered = useCallback((payload: TauriEvents['peer-discovered']) => {
    const peer: Peer = {
      id: payload.id,
      name: payload.name,
      hostname: payload.hostname,
      ip: payload.address,
      port: payload.port,
      initials: initialsFromName(payload.name),
      color: colorFromId(payload.id),
      status: 'online',
      signal: 4,
      ping: 0,
      lastSeen: 'now',
      unread: 0,
    };
    usePeerStore.getState().addPeer(peer);
  }, []);

  const handlePeerLost = useCallback((payload: TauriEvents['peer-lost']) => {
    usePeerStore.getState().removePeer(payload.id);
  }, []);

  useTauriEvent('peer-discovered', handlePeerDiscovered);
  useTauriEvent('peer-lost', handlePeerLost);
  const { peers, activePeerId, setActivePeer, totalUnread } = usePeerStore();
  const callStore = useCallStore();
  const { messages, sendMessage, loadMessages, markRead, clearHistory } = useChatStore();

  // Load history and send read acks whenever the active peer changes.
  useEffect(() => {
    if (!activePeerId) return;
    loadMessages(activePeerId).catch(console.error);
    markRead(activePeerId);
  }, [activePeerId]); // eslint-disable-line react-hooks/exhaustive-deps
  const { transfers, acceptTransfer, declineTransfer, cancelTransfer, pauseTransfer, tickProgress } = useFileStore();

  const [tab, setTab] = useState<Tab>('chats');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const incomingPeerId = callStore.incomingCallPeerId;

  // Wire WebRTC signaling events → peerConnectionManager
  usePeerConnections();

  const activePeer = peers.find((p) => p.id === activePeerId) ?? null;
  const offeredCount = transfers.filter((t) => t.state === 'offered').length;

  // Apply theme to document root
  useEffect(() => {
    const r = document.documentElement;
    const applyLight = () => {
      r.style.setProperty('--bg',           'oklch(0.985 0.003 250)');
      r.style.setProperty('--bg-2',         'oklch(0.965 0.004 250)');
      r.style.setProperty('--surface',      'oklch(0.99 0.003 250)');
      r.style.setProperty('--surface-2',    'oklch(0.95 0.005 250)');
      r.style.setProperty('--line',         'oklch(0.86 0.005 250)');
      r.style.setProperty('--line-soft',    'oklch(0.92 0.004 250)');
      r.style.setProperty('--text',         'oklch(0.18 0.008 250)');
      r.style.setProperty('--text-dim',     'oklch(0.40 0.008 250)');
      r.style.setProperty('--text-mute',    'oklch(0.58 0.008 250)');
      // Chrome-specific vars (topbar, sidebar, active tabs) for light mode
      r.style.setProperty('--chrome-bg',      'oklch(0.96 0.004 250)');
      r.style.setProperty('--chrome-surface', 'oklch(0.90 0.005 250)');
      r.style.setProperty('--chrome-pill',    'oklch(0.88 0.005 250)');
      document.body.style.background = '#f7f8fa';
    };
    const applyDark = () => {
      ['--bg','--bg-2','--surface','--surface-2','--line','--line-soft','--text','--text-dim','--text-mute',
       '--chrome-bg','--chrome-surface','--chrome-pill']
        .forEach((k) => r.style.removeProperty(k));
      document.body.style.background = '#0b0d10';
    };
    if (theme === 'light') { applyLight(); return; }
    if (theme === 'dark')  { applyDark();  return; }
    // system
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.matches ? applyDark() : applyLight();
    const handler = (e: MediaQueryListEvent) => e.matches ? applyDark() : applyLight();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  // Call duration ticker
  const callTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (callStore.inCall) {
      callTickRef.current = setInterval(() => callStore.tick(), 1000);
    } else {
      if (callTickRef.current) clearInterval(callTickRef.current);
    }
    return () => { if (callTickRef.current) clearInterval(callTickRef.current); };
  }, [!!callStore.inCall]); // eslint-disable-line react-hooks/exhaustive-deps

  // File transfer progress ticker
  useEffect(() => {
    const id = setInterval(() => tickProgress(), 1000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCall = (peerId: string, video = true) => {
    setActivePeer(peerId);
    callStore.startCall(peerId, video).catch(console.error);
    setTab('calls');
  };

  const handleEndCall = () => {
    const name = peers.find((p) => p.id === callStore.inCall)?.name ?? 'peer';
    toast(`Call with ${name} ended · ${fmtDuration(callStore.duration)}`);
    callStore.endCall();
  };

  const handleTransferAction = (id: string, action: string) => {
    if (action === 'accept')  { acceptTransfer(id);  toast('Accepted incoming file'); }
    if (action === 'decline') { declineTransfer(id); toast('Declined file offer'); }
    if (action === 'cancel')  cancelTransfer(id);
    if (action === 'pause')   pauseTransfer(id);
  };

  const showChatPanel = callStore.inCall && tab === 'calls' && callStore.chatPanelOpen && activePeer !== null;

  return (
    <div style={{ display: 'grid', gridTemplateRows: '44px 1fr', height: '100vh', overflow: 'hidden', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--sans)' }}>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid var(--line-soft)', background: 'var(--chrome-bg, oklch(0.19 0.012 250))', WebkitAppRegion: 'drag' } as React.CSSProperties}>
        {/* Left: traffic lights + logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, letterSpacing: 0.2, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <span style={{ color: 'var(--accent)' }}><Icons.Logo size={18} /></span>
            NetLink
          </div>
        </div>

        {/* Centre: tab bar */}
        <nav style={{ display: 'flex', gap: 2, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {([
            ['calls', 'Calls',   Icons.Phone, callStore.inCall ? '●' : null,  'var(--accent)'],
            ['chats', 'Chats',   Icons.Chat,  totalUnread() > 0 ? String(totalUnread()) : null, 'var(--accent)'],
            ['files', 'Files',   Icons.File,  offeredCount > 0 ? String(offeredCount) : null, 'var(--warn)'],
          ] as const).map(([key, label, Ic, badge, badgeBg]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 7, fontSize: 12.5, fontWeight: tab === key ? 600 : 400, background: tab === key ? 'var(--chrome-surface, oklch(0.26 0.014 250))' : 'transparent', border: `1px solid ${tab === key ? 'var(--line)' : 'transparent'}`, color: tab === key ? 'var(--text)' : 'var(--text-dim)', position: 'relative' }}
            >
              <Ic size={14} /> {label}
              {badge && (
                <span style={{ minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: badgeBg, color: '#0b0d10', fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Right: LAN pill + actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div title={`${local.hostname} · ${local.ip}:${local.port}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: 'var(--chrome-pill, oklch(0.24 0.014 250))', border: '1px solid var(--line-soft)', fontFamily: 'var(--mono)', fontSize: 11 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--accent)', animation: 'pulse 1.6s ease-out infinite' }} />
            LAN <code style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>{local.ip}</code>
          </div>
          <button title="Notifications" style={{ width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, border: '1px solid transparent', background: 'transparent', color: 'var(--text-dim)' }}>
            <Icons.Bell size={15} />
          </button>
          <button
            title="Settings"
            onClick={() => setSettingsOpen(true)}
            style={{ width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, border: `1px solid ${settingsOpen ? 'var(--line)' : 'transparent'}`, background: settingsOpen ? 'var(--chrome-surface, oklch(0.26 0.014 250))' : 'transparent', color: 'var(--text-dim)' }}
          >
            <Icons.Settings size={15} />
          </button>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', minHeight: 0, overflow: 'hidden' }}>
        <PeerList
          peers={peers}
          local={local}
          activePeerId={activePeerId}
          onSelect={setActivePeer}
          onCall={(id) => handleCall(id, true)}
        />

        <main style={{ minWidth: 0, minHeight: 0, overflow: 'hidden', display: 'grid', gridTemplateColumns: showChatPanel ? '1fr 360px' : '1fr' }}>
          {/* Primary panel */}
          <div style={{ minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
            {tab === 'calls' && (
              <CallsView
                peers={peers}
                local={local}
                callState={callStore}
                onCall={handleCall}
                onToggleMute={callStore.toggleMute}
                onToggleVideo={callStore.toggleVideo}
                onToggleScreenshare={callStore.toggleScreenshare}
                onToggleChatPanel={callStore.toggleChatPanel}
                onEnd={handleEndCall}
                onSendFile={() => setTab('files')}
              />
            )}
            {tab === 'chats' && (
              activePeer
                ? (
                  <ChatsView
                    peer={activePeer}
                    messages={messages[activePeer.id] ?? []}
                    onSend={(text) => sendMessage(activePeer.id, text)}
                    onCall={() => handleCall(activePeer.id, false)}
                    onVideo={() => handleCall(activePeer.id, true)}
                  />
                )
                : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-mute)', fontSize: 13 }}>
                    Select a peer to start chatting
                  </div>
                )
            )}
            {tab === 'files' && (
              <FilesView
                transfers={transfers}
                peers={peers}
                activePeerId={activePeerId}
                onAction={handleTransferAction}
                onSendFile={(peerId, file) =>
                  useFileStore.getState().offerFile(peerId, file).catch(console.error)
                }
              />
            )}
          </div>

          {/* Embedded chat side panel when in call */}
          {showChatPanel && activePeer && (
            <aside style={{ borderLeft: '1px solid var(--line)', background: 'var(--bg-2)', minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
              <ChatsView
                peer={activePeer}
                messages={messages[activePeer.id] ?? []}
                onSend={(text) => sendMessage(activePeer.id, text)}
                onCall={() => handleCall(activePeer.id, false)}
                onVideo={() => handleCall(activePeer.id, true)}
                embedded
                showTech={false}
              />
            </aside>
          )}
        </main>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {incomingPeerId && (() => {
        const caller = peers.find((p) => p.id === incomingPeerId);
        return caller ? (
          <IncomingCallModal
            peer={caller}
            onAccept={(video) => {
              setActivePeer(incomingPeerId);
              callStore.acceptCall(incomingPeerId, video).catch(console.error);
              setTab('calls');
            }}
            onDecline={() => {
              callStore.rejectCall(incomingPeerId);
              toast('Call declined');
            }}
          />
        ) : null;
      })()}

      {settingsOpen && (
        <SettingsModal
          local={local}
          displayName={local.name}
          theme={theme}
          selectedCameraId={selectedCameraId}
          selectedMicId={selectedMicId}
          onDisplayNameChange={setDisplayName}
          onThemeChange={setTheme}
          onCameraChange={setCamera}
          onMicChange={setMic}
          onClearHistory={() => clearHistory().catch(console.error)}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {/* ── Toasts ──────────────────────────────────────────────────────── */}
      <ToastStack />
    </div>
  );
}
