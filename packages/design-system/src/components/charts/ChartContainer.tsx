import type { CSSProperties, ReactNode } from 'react';

type ChartContainerProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

const rootStyle: CSSProperties = {
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'var(--colors-border-subtle, #d0d5dd)',
  borderRadius: 12,
  background: 'var(--colors-surface-default, #ffffff)',
  overflow: 'hidden',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 12,
  padding: 16,
  borderBottomWidth: 1,
  borderBottomStyle: 'solid',
  borderBottomColor: 'var(--colors-border-subtle, #d0d5dd)',
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.35,
  color: 'var(--colors-text-default, #111827)',
};

const subtitleStyle: CSSProperties = {
  margin: '4px 0 0',
  fontSize: 12,
  lineHeight: 1.4,
  color: 'var(--colors-text-muted, #667085)',
};

const contentStyle: CSSProperties = {
  padding: 16,
};

const footerStyle: CSSProperties = {
  padding: '12px 16px',
  borderTopWidth: 1,
  borderTopStyle: 'solid',
  borderTopColor: 'var(--colors-border-subtle, #d0d5dd)',
  fontSize: 12,
  color: 'var(--colors-text-muted, #667085)',
};

export function ChartContainer({
  title,
  subtitle,
  actions,
  children,
  footer,
  className,
}: ChartContainerProps) {
  return (
    <section className={className} style={rootStyle}>
      <header style={headerStyle}>
        <div>
          <h3 style={titleStyle}>{title}</h3>
          {subtitle ? <p style={subtitleStyle}>{subtitle}</p> : null}
        </div>
        {actions ? <div>{actions}</div> : null}
      </header>
      <div style={contentStyle}>{children}</div>
      {footer ? <footer style={footerStyle}>{footer}</footer> : null}
    </section>
  );
}
