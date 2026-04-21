import { type CSSProperties } from 'react';

import { useTheme, type ThemeMode } from '../theme/useTheme';

const containerStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: 4,
  borderRadius: 999,
  border: '1px solid var(--colors-border-subtle, #d0d5dd)',
  background: 'var(--colors-surface-subtle, #f8f9fb)',
};

const buttonBaseStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  border: 0,
  borderRadius: 999,
  padding: '6px 10px',
  fontSize: 12,
  lineHeight: 1.2,
  cursor: 'pointer',
  background: 'transparent',
  color: 'var(--colors-text-muted, #667085)',
};

const activeButtonStyle: CSSProperties = {
  background: 'var(--colors-surface-default, #ffffff)',
  color: 'var(--colors-text-default, #111827)',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
};

const MODES: Array<{ mode: ThemeMode; label: string }> = [
  { mode: 'auto', label: 'Auto' },
  { mode: 'light', label: 'Light' },
  { mode: 'dark', label: 'Dark' },
];

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  const iconProps = {
    'aria-hidden': true,
    fill: 'none',
    height: 14,
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.5,
    viewBox: '0 0 16 16',
    width: 14,
  };

  switch (mode) {
    case 'auto':
      return (
        <svg {...iconProps}>
          <rect x="2.5" y="3" width="11" height="7.5" rx="1.5" />
          <path d="M6 13h4" />
          <path d="M8 10.5V13" />
        </svg>
      );
    case 'light':
      return (
        <svg {...iconProps}>
          <circle cx="8" cy="8" r="2.5" />
          <path d="M8 1.75v1.5" />
          <path d="M8 12.75v1.5" />
          <path d="M1.75 8h1.5" />
          <path d="M12.75 8h1.5" />
          <path d="M3.6 3.6l1.05 1.05" />
          <path d="M11.35 11.35l1.05 1.05" />
          <path d="M11.35 4.65l1.05-1.05" />
          <path d="M3.6 12.4l1.05-1.05" />
        </svg>
      );
    default:
      return (
        <svg {...iconProps}>
          <path d="M10.75 1.75a5.75 5.75 0 1 0 3.5 10.3A6.5 6.5 0 0 1 10.75 1.75Z" />
        </svg>
      );
  }
}

export function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <div role="radiogroup" aria-label="Theme mode" style={containerStyle}>
      {MODES.map((item) => {
        const active = mode === item.mode;
        return (
          <button
            key={item.mode}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setMode(item.mode)}
            style={active ? { ...buttonBaseStyle, ...activeButtonStyle } : buttonBaseStyle}
          >
            <ThemeIcon mode={item.mode} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
