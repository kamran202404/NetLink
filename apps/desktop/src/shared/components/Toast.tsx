import { useToastStore } from '@/shared/toastStore';
export type { ToastItem } from '@/shared/toastStore';

/** Renders the global toast stack. Drop one instance anywhere in the tree. */
export function ToastStack() {
  const { toasts, dismissToast } = useToastStore();
  if (toasts.length === 0) return null;
  return (
    <div style={{ position: 'fixed', bottom: 18, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', pointerEvents: 'none' }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{ background: 'oklch(0.26 0.014 250)', border: '1px solid var(--line)', padding: '8px 14px', borderRadius: 10, fontSize: 12.5, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 10px 30px rgba(0,0,0,.4)', animation: 'toastIn .25s ease-out', pointerEvents: 'auto', maxWidth: 420 }}
        >
          <span style={{ color: 'var(--accent)', flexShrink: 0 }}>●</span>
          <span style={{ flex: 1 }}>{t.text}</span>
          {t.action && (
            <button
              onClick={() => { t.action!.onClick(); dismissToast(t.id); }}
              style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11.5, fontWeight: 600, background: 'var(--accent)', border: 'none', color: '#0b0d10', cursor: 'pointer', flexShrink: 0 }}
            >
              {t.action.label}
            </button>
          )}
          <button onClick={() => dismissToast(t.id)} style={{ width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 0, background: 'transparent', color: 'var(--text-mute)', cursor: 'pointer', flexShrink: 0, fontSize: 14 }}>×</button>
        </div>
      ))}
    </div>
  );
}
