import { useState } from 'react';
import type { LocalPeer } from '@netlink/core';
import { Avatar } from '@/shared/components/Avatar';
import * as Icons from '@/shared/icons';

type Tab = 'identity' | 'devices' | 'network' | 'storage' | 'appearance' | 'advanced';

const TABS: [Tab, string, React.ComponentType<any>][] = [
  ['identity',   'Identity',   Icons.Users],
  ['devices',    'Devices',    Icons.Camera],
  ['network',    'Network',    Icons.Wifi],
  ['storage',    'Storage',    Icons.Folder],
  ['appearance', 'Appearance', Icons.Sun],
  ['advanced',   'Advanced',   Icons.Cpu],
];

function SField({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 12.5, fontWeight: 500 }}>{label}</div>
      {desc && <div style={{ fontSize: 11.5, color: 'var(--text-mute)' }}>{desc}</div>}
      {children}
    </div>
  );
}

function SSelect({ value, options }: { value: string; options: string[] }) {
  return (
    <select defaultValue={value} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--sans)' }}>
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
}

interface SettingsModalProps {
  local: LocalPeer;
  displayName: string;
  theme: 'dark' | 'light' | 'system';
  onDisplayNameChange: (name: string) => void;
  onThemeChange: (theme: 'dark' | 'light' | 'system') => void;
  onClose: () => void;
}

export function SettingsModal({ local, displayName, theme, onDisplayNameChange, onThemeChange, onClose }: SettingsModalProps) {
  const [tab, setTab] = useState<Tab>('identity');

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(8,10,12,.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn .15s ease-out' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, width: 'min(640px, 94vw)', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,.55)', animation: 'modalIn .2s cubic-bezier(.2,.7,.2,1)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--line-soft)' }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Settings</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid transparent', background: 'transparent', color: 'var(--text-dim)' }}><Icons.X size={15} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', minHeight: 380 }}>
          {/* Sidenav */}
          <div style={{ display: 'flex', flexDirection: 'column', padding: '12px 8px', borderRight: '1px solid var(--line-soft)', gap: 2, background: 'oklch(0.20 0.012 250)' }}>
            {TABS.map(([k, label, Ic]) => (
              <button key={k} onClick={() => setTab(k)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 7, fontSize: 12.5, color: tab === k ? 'var(--text)' : 'var(--text-dim)', background: tab === k ? 'oklch(0.26 0.014 250)' : 'transparent', border: `1px solid ${tab === k ? 'var(--line)' : 'transparent'}` }}>
                <Ic size={14} /> {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="scroll" style={{ padding: '18px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {tab === 'identity' && (
              <>
                <SField label="Display name" desc="Shown to peers instead of your UUID.">
                  <input value={displayName} onChange={(e) => onDisplayNameChange(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--sans)' }} />
                </SField>
                <SField label="Peer ID" desc="Generated once on first launch. Persists locally.">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-dim)' }}>
                    <span>{local.id}</span>
                    <button style={{ width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 0, background: 'transparent', color: 'var(--text-dim)' }}><Icons.Copy size={12} /></button>
                  </div>
                </SField>
                <SField label="Hostname / Signaling endpoint">
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6 }}>
                    {local.hostname}<br />
                    <span style={{ color: 'var(--accent)' }}>ws://{local.ip}:{local.port}</span> (LAN-only)
                  </div>
                </SField>
              </>
            )}
            {tab === 'devices' && (
              <>
                <SField label="Camera"><SSelect value="FaceTime HD Camera" options={['FaceTime HD Camera', 'Logi C920 (USB)', 'OBS Virtual Camera']} /></SField>
                <SField label="Microphone">
                  <SSelect value="MacBook Pro Microphone" options={['MacBook Pro Microphone', 'Røde NT-USB', 'Logi C920 (USB)']} />
                  <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-mute)', marginBottom: 6 }}>Input level</div>
                    <div style={{ height: 6, borderRadius: 3, background: 'oklch(0.20 0.012 250)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: '42%', background: 'linear-gradient(90deg, var(--accent), oklch(0.80 0.16 75))' }} />
                    </div>
                  </div>
                </SField>
                <SField label="Speaker"><SSelect value="MacBook Pro Speakers" options={['MacBook Pro Speakers', 'AirPods Pro', 'Studio Monitors']} /></SField>
              </>
            )}
            {tab === 'network' && (
              <>
                <SField label="mDNS service" desc="Advertised on the local network so peers can find you.">
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-dim)' }}>_p2pchat._tcp.local</div>
                </SField>
                <SField label="Discovery interface"><SSelect value="en0 · Wi-Fi · studio-wifi" options={['en0 · Wi-Fi · studio-wifi', 'en1 · Ethernet']} /></SField>
                <SField label="ICE policy"><div style={{ fontFamily: 'var(--mono)', color: 'var(--text-dim)', fontSize: 12 }}>host candidates only · no STUN/TURN · iceTransportPolicy: "all"</div></SField>
                <SField label="Signaling port"><div style={{ fontFamily: 'var(--mono)', color: 'var(--text-dim)', fontSize: 12 }}>random ephemeral · currently <span style={{ color: 'var(--accent)' }}>{local.port}</span></div></SField>
              </>
            )}
            {tab === 'storage' && (
              <>
                <SField label="Download folder">
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, padding: '8px 10px', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 8, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-dim)' }}>~/NetLink/Received</div>
                    <button style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 500, background: 'oklch(0.27 0.014 250)', border: '1px solid var(--line)', color: 'var(--text)' }}><Icons.Folder size={13} /> Choose…</button>
                  </div>
                </SField>
                <SField label="Chat history" desc="Stored in local SQLite. Never leaves this machine.">
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 500, background: 'oklch(0.27 0.014 250)', border: '1px solid var(--line)', color: 'var(--text)' }}><Icons.Download size={13} /> Export…</button>
                    <button style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 500, background: 'oklch(0.27 0.014 250)', border: '1px solid var(--line)', color: 'var(--text)' }}><Icons.Trash size={13} /> Clear all</button>
                  </div>
                </SField>
              </>
            )}
            {tab === 'appearance' && (
              <SField label="Theme">
                <div style={{ display: 'flex', gap: 6 }}>
                  {([['dark', 'Dark', Icons.Moon], ['light', 'Light', Icons.Sun], ['system', 'System', Icons.Cpu]] as const).map(([k, label, Ic]) => (
                    <button key={k} onClick={() => onThemeChange(k as 'dark' | 'light' | 'system')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 7, fontSize: 11.5, fontWeight: 500, background: theme === k ? 'oklch(0.28 0.014 250)' : 'transparent', border: `1px solid ${theme === k ? 'var(--line)' : 'transparent'}`, color: 'var(--text)' }}><Ic size={14} /> {label}</button>
                  ))}
                </div>
              </SField>
            )}
            {tab === 'advanced' && (
              <div style={{ color: 'var(--text-mute)', fontSize: 13 }}>Advanced settings coming soon.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
