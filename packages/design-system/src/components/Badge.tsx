import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: BadgeTone;
};

const toneStyles: Record<BadgeTone, CSSProperties> = {
  neutral: {
    background: 'var(--colors-gray-100, #f2f4f7)',
    color: 'var(--colors-gray-600, #475467)',
  },
  success: {
    background: 'var(--colors-green-50, #ecfdf3)',
    color: 'var(--colors-green-700, #027a48)',
  },
  warning: {
    background: 'var(--colors-yellow-50, #fffaeb)',
    color: 'var(--colors-yellow-800, #93370d)',
  },
  danger: {
    background: 'var(--colors-red-100, #fee4e2)',
    color: 'var(--colors-red-800, #912018)',
  },
};

const baseStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1,
  paddingInline: 10,
  paddingBlock: 6,
  whiteSpace: 'nowrap',
};

export function Badge({
  children,
  tone = 'neutral',
  style,
  ...props
}: BadgeProps) {
  return (
    <span
      {...props}
      style={{
        ...baseStyle,
        ...toneStyles[tone],
        ...style,
      }}
      data-scope="badge"
      data-part="root"
      data-tone={tone}
    >
      {children}
    </span>
  );
}
