import { type ButtonHTMLAttributes, type ReactNode } from 'react';

type ButtonVariant = 'default' | 'primary' | 'danger' | 'ghost';
type ButtonSize    = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const base = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  borderRadius: 8,
  fontWeight: 500,
  border: '1px solid var(--line)',
  background: 'oklch(0.27 0.014 250)',
  color: 'var(--text)',
} as const;

const variants: Record<ButtonVariant, React.CSSProperties> = {
  default: {},
  primary: { background: 'var(--accent)', color: '#0b0d10', borderColor: 'transparent', fontWeight: 600 },
  danger:  { background: 'var(--danger)', color: '#fff', borderColor: 'transparent' },
  ghost:   { background: 'transparent', borderColor: 'transparent' },
};

const sizes: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '5px 10px', fontSize: 11.5, borderRadius: 7 },
  md: { padding: '7px 12px', fontSize: 12.5 },
};

export function Button({ variant = 'default', size = 'md', style, children, ...rest }: ButtonProps) {
  return (
    <button
      style={{ ...base, ...variants[variant], ...sizes[size], ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}

// 32×32 icon-only button used throughout the topbar and headers
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: ReactNode;
}

export function IconButton({ active, style, children, ...rest }: IconButtonProps) {
  return (
    <button
      style={{
        width: 32,
        height: 32,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        border: active ? '1px solid var(--line)' : '1px solid transparent',
        background: active ? 'oklch(0.28 0.016 250)' : 'transparent',
        color: active ? 'var(--text)' : 'var(--text-dim)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
