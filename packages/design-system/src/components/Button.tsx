import { type ButtonHTMLAttributes, type CSSProperties } from 'react';

export type ButtonVariant = 'panel' | 'item';
export type ButtonSize = 'md' | 'lg';
export type ButtonDensity = 'comfortable' | 'compact';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  density?: ButtonDensity;
  selected?: boolean;
  tone?: 'default' | 'subdued';
  gap?: number | string;
};

const panelBaseStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'var(--colors-border-subtle, #d0d5dd)',
  borderRadius: 8,
  background: 'var(--colors-surface-default, #ffffff)',
  color: 'var(--colors-text-default, #111827)',
  textDecoration: 'none',
  cursor: 'pointer',
  fontSize: 13,
  lineHeight: 1.3,
};

const panelDisabledStyle: CSSProperties = {
  opacity: 0.5,
  cursor: 'not-allowed',
};

const panelSizeStyleMap: Record<ButtonSize, CSSProperties> = {
  md: {
    height: 32,
    paddingInline: 10,
  },
  lg: {
    height: 36,
    paddingInline: 12,
  },
};

const itemBaseStyle: CSSProperties = {
  display: 'flex',
  width: '100%',
  alignItems: 'baseline',
  gap: 8,
  textAlign: 'left',
  borderRadius: 8,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'transparent',
  background: 'transparent',
  color: 'var(--colors-text-default, #111827)',
  cursor: 'pointer',
  transitionDuration: '120ms',
  transitionProperty: 'background-color, color, border-color, box-shadow',
};

const itemDensityStyleMap: Record<ButtonDensity, CSSProperties> = {
  comfortable: {
    paddingInline: 8,
    paddingBlock: 6,
    fontSize: 14,
  },
  compact: {
    paddingInline: 8,
    paddingBlock: 4,
    fontSize: 12,
  },
};

const itemSelectedStyle: CSSProperties = {
  background: 'var(--colors-interactive-selected, #eef4ff)',
};

const itemSubduedStyle: CSSProperties = {
  color: 'var(--colors-text-muted, #667085)',
};

export function Button({
  variant = 'panel',
  size = 'md',
  iconOnly = false,
  density = 'comfortable',
  selected = false,
  tone = 'default',
  gap,
  style,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  const computedStyle: CSSProperties =
    variant === 'item'
      ? {
          ...itemBaseStyle,
          ...itemDensityStyleMap[density],
          ...(selected ? itemSelectedStyle : undefined),
          ...(tone === 'subdued' ? itemSubduedStyle : undefined),
          ...(disabled ? panelDisabledStyle : undefined),
        }
      : {
          ...panelBaseStyle,
          ...panelSizeStyleMap[size],
          ...(iconOnly
            ? {
                width: size === 'lg' ? 36 : 32,
                paddingInline: 0,
                justifyContent: 'center',
                gap: 0,
              }
            : undefined),
          ...(disabled ? panelDisabledStyle : undefined),
        };

  return (
    <button
      {...props}
      type={type}
      disabled={disabled}
      style={{
        ...computedStyle,
        ...(gap !== undefined ? { gap } : undefined),
        ...style,
      }}
      data-variant={variant}
      data-selected={selected ? '' : undefined}
      data-icon-only={iconOnly ? '' : undefined}
    />
  );
}
