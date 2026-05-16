import { create } from 'zustand';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  text: string;
  action?: ToastAction;
  /** milliseconds before auto-dismiss; defaults to 4000, 0 = never */
  duration?: number;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (item: Omit<ToastItem, 'id'>) => string;
  dismissToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>()((set) => ({
  toasts: [],

  addToast: (item) => {
    const id = Math.random().toString(36).slice(2, 8);
    set((s) => ({ toasts: [...s.toasts, { id, ...item }] }));
    const ms = item.duration ?? 4000;
    if (ms > 0) setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), ms);
    return id;
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Fire-and-forget helper callable from any Zustand store or module. */
export function toast(text: string, action?: ToastAction, duration?: number): string {
  const item: Omit<ToastItem, 'id'> = { text };
  if (action !== undefined) item.action = action;
  if (duration !== undefined) item.duration = duration;
  return useToastStore.getState().addToast(item);
}
