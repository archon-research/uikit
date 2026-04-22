import { type CSSProperties, type ReactNode, type SelectHTMLAttributes } from 'react';

type StyledSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  children: ReactNode;
  className?: string;
};

const wrapperStyle: CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  width: '100%',
};

const selectStyle: CSSProperties = {
  width: '100%',
  minWidth: 0,
  height: 36,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'var(--colors-border-subtle, #d0d5dd)',
  borderRadius: 8,
  paddingLeft: 12,
  paddingRight: 40,
  background: 'var(--colors-surface-default, #ffffff)',
  color: 'var(--colors-text-default, #111827)',
  fontSize: 14,
  lineHeight: 1.4,
  fontFamily: 'inherit',
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
};

const disabledSelectStyle: CSSProperties = {
  opacity: 0.65,
  cursor: 'not-allowed',
};

const chevronStyle: CSSProperties = {
  position: 'absolute',
  top: '50%',
  right: 12,
  width: 16,
  height: 16,
  color: 'var(--colors-text-muted, #667085)',
  pointerEvents: 'none',
  transform: 'translateY(-50%)',
};

function SelectChevron() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" style={chevronStyle}>
      <path
        d="M4 6.5L8 10l4-3.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function StyledSelect({
  children,
  className,
  ...props
}: StyledSelectProps) {
  return (
    <div className={className} style={wrapperStyle}>
      <select
        {...props}
        style={props.disabled ? { ...selectStyle, ...disabledSelectStyle } : selectStyle}
      >
        {children}
      </select>
      <SelectChevron />
    </div>
  );
}
