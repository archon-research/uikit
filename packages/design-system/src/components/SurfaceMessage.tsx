import { type CSSProperties, type ReactNode } from 'react';

type SurfaceMessageProps = {
  title: string;
  body: string;
  tone?: 'default' | 'muted' | 'dashed';
  children?: ReactNode;
};

const wrapperStyle: CSSProperties = {
  borderRadius: 8,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'var(--colors-border-subtle, #d0d5dd)',
  background: 'var(--colors-surface-subtle, #f8f9fb)',
  padding: 16,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--colors-text-strong, #111827)',
};

const bodyStyle: CSSProperties = {
  margin: 0,
  marginTop: 8,
  fontSize: 14,
  color: 'var(--colors-text-muted, #667085)',
};

export function SurfaceMessage({
  title,
  body,
  tone = 'default',
  children,
}: SurfaceMessageProps) {
  const style =
    tone === 'dashed'
      ? { ...wrapperStyle, borderStyle: 'dashed' as const }
      : tone === 'muted'
        ? {
            ...wrapperStyle,
            background: 'var(--colors-surface-default, #ffffff)',
          }
        : wrapperStyle;

  return (
    <div style={style}>
      <p style={titleStyle}>{title}</p>
      <p style={bodyStyle}>{body}</p>
      {children}
    </div>
  );
}
