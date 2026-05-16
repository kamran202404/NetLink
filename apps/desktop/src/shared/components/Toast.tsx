import { useState, useCallback, type ReactNode } from 'react';

export interface ToastItem {
  id: string;
  text: string;
  icon?: ReactNode;
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((item: { text: string; icon?: ReactNode }) => {
    const id = Math.random().toString(36).slice(2, 8);
    setToasts((prev) => [...prev, { id, ...item }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, dismissToast };
}

export function ToastStack({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss?: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div style={{ position: 'fixed', bottom: 18, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => onDismiss?.(t.id)}
          style={{ background: 'oklch(0.26 0.014 250)', border: '1px solid var(--line)', padding: '8px 14px', borderRadius: 10, fontSize: 12.5, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 10px 30px rgba(0,0,0,.4)', animation: 'toastIn .25s ease-out', cursor: onDismiss ? 'pointer' : 'default' }}
        >
          <span style={{ color: 'var(--accent)' }}>●</span>
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
