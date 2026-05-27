import {
  forwardRef,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from 'react';

import type { ButtonDensity } from './Button';

export type TreeRowProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: ReactNode;
  leading?: ReactNode;
  beforeLabel?: ReactNode;
  reserveLeadingSpace?: boolean;
  density?: ButtonDensity;
  selected?: boolean;
  tone?: 'default' | 'subdued';
};

const disabledStyle: CSSProperties = {
  opacity: 0.5,
  cursor: 'not-allowed',
};

const baseStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  width: '100%',
  alignItems: 'center',
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

const densityStyleMap: Record<ButtonDensity, CSSProperties> = {
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

const selectedStyle: CSSProperties = {
  background: 'var(--colors-interactive-selected, #eef4ff)',
};

const subduedStyle: CSSProperties = {
  color: 'var(--colors-text-muted, #667085)',
};

const leadingSlotStyle: CSSProperties = {
  width: 28,
  height: 28,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const labelStyle: CSSProperties = {
  display: 'block',
  flex: '1 1 0%',
  minWidth: 0,
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const TreeRow = forwardRef<HTMLButtonElement, TreeRowProps>(
  function TreeRow(
    {
      label,
      leading,
      beforeLabel,
      reserveLeadingSpace = Boolean(leading),
      density = 'comfortable',
      selected = false,
      tone = 'default',
      style,
      disabled,
      type = 'button',
      ...props
    },
    ref,
  ) {
    return (
      <button
        {...props}
        ref={ref}
        type={type}
        disabled={disabled}
        style={{
          ...baseStyle,
          ...densityStyleMap[density],
          ...(selected ? selectedStyle : undefined),
          ...(tone === 'subdued' ? subduedStyle : undefined),
          ...(disabled ? disabledStyle : undefined),
          ...style,
        }}
        data-scope="tree-row"
        data-part="root"
        data-density={density}
        data-tone={tone}
        data-selected={selected ? '' : undefined}
      >
        {beforeLabel}
        {reserveLeadingSpace ? (
          <span aria-hidden style={leadingSlotStyle} data-part="leading">
            {leading}
          </span>
        ) : null}
        <span style={labelStyle} data-part="label">
          {label}
        </span>
      </button>
    );
  },
);
