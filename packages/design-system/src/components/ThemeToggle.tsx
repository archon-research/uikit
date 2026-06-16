import { Laptop, Moon, Sun } from 'lucide-react';
import { type CSSProperties } from 'react';

import { useTheme, type ThemeMode } from '../theme/useTheme';

const containerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  width: '100%',
  boxSizing: 'border-box',
  padding: 4,
  borderRadius: 10,
  border: '1px solid var(--colors-border-subtle, #d0d5dd)',
  background: 'var(--colors-surface-subtle, #f8f9fb)',
};

const buttonBaseStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
  minWidth: 0,
  gap: 6,
  border: 0,
  borderRadius: 8,
  padding: '6px 10px',
  fontSize: 12,
  lineHeight: 1.2,
  cursor: 'pointer',
  background: 'transparent',
  color: 'var(--colors-text-muted, #667085)',
};

const radioInputStyle: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  border: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(100%)',
  whiteSpace: 'nowrap',
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
    size: 14,
    strokeWidth: 1.75,
  };

  switch (mode) {
    case 'auto':
      return <Laptop {...iconProps} />;
    case 'light':
      return <Sun {...iconProps} />;
    default:
      return <Moon {...iconProps} />;
  }
}

export function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <div role="radiogroup" aria-label="Theme mode" style={containerStyle}>
      {MODES.map((item) => {
        const active = mode === item.mode;
        return (
          <label
            key={item.mode}
            style={
              active
                ? { ...buttonBaseStyle, ...activeButtonStyle }
                : buttonBaseStyle
            }
          >
            <input
              type="radio"
              name="theme-mode"
              aria-label={item.label}
              checked={active}
              onChange={() => setMode(item.mode)}
              style={radioInputStyle}
            />
            <ThemeIcon mode={item.mode} />
            {item.label}
          </label>
        );
      })}
    </div>
  );
}
