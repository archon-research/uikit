import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

export type IndicatorStatus = 'idle' | 'ready' | 'active' | 'pending' | 'error';

type IndicatorProps = HTMLAttributes<HTMLSpanElement> & {
  /** Drives the dot colour and pulse. */
  status?: IndicatorStatus;
  /** Optional label rendered next to the dot. */
  children?: ReactNode;
  /** Dot diameter in px. */
  size?: number;
};

const statusColors: Record<IndicatorStatus, string> = {
  idle: 'var(--colors-gray-400, #98a2b3)',
  ready: 'var(--colors-blue-500, #2e90fa)',
  active: 'var(--colors-green-500, #12b76a)',
  pending: 'var(--colors-yellow-500, #f79009)',
  error: 'var(--colors-red-500, #f04438)',
};

const rootStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1,
  color: 'var(--colors-gray-600, #475467)',
  whiteSpace: 'nowrap',
};

/**
 * A small status dot, optionally with a label. Use for connection state and
 * other at-a-glance liveness signals. The `pending` status pulses to read as
 * "in transition".
 */
export function Indicator({
  status = 'idle',
  size = 8,
  children,
  style,
  ...props
}: IndicatorProps) {
  const color = statusColors[status];
  return (
    <span
      {...props}
      style={{ ...rootStyle, ...style }}
      data-scope="indicator"
      data-part="root"
      data-status={status}
    >
      <span
        data-part="dot"
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 0 2px color-mix(in srgb, ${color} 25%, transparent)`,
          animation:
            status === 'pending'
              ? 'ds-indicator-pulse 1.2s ease-in-out infinite'
              : undefined,
        }}
      />
      {children}
      <style>
        {'@keyframes ds-indicator-pulse{0%,100%{opacity:1}50%{opacity:0.35}}'}
      </style>
    </span>
  );
}
