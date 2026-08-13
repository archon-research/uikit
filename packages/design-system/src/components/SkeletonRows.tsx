import { type CSSProperties } from 'react';

import { usePrefersReducedMotion } from '../hooks/useMediaQuery.js';
import {
  SKELETON_PULSE_ANIMATION,
  SKELETON_PULSE_KEYFRAMES,
  SKELETON_PULSE_PEAK_OPACITY,
} from './skeletonPulse.js';

type SkeletonRowsProps = {
  rows?: number;
  columns?: number;
  firstColumnTall?: boolean;
  /** Pulses each block to signal loading. Default true; suppressed under `prefers-reduced-motion`. */
  animate?: boolean;
  /** Applied to each skeleton `<tr>`. */
  className?: string;
  style?: CSSProperties;
};

const rowStyle: CSSProperties = {
  borderBottomWidth: 1,
  borderBottomStyle: 'solid',
  borderBottomColor: 'var(--colors-border-subtle, #d0d5dd)',
};

const cellStyle: CSSProperties = {
  padding: '14px 0',
};

const blockBaseStyle: CSSProperties = {
  // The 16px horizontal inset is a width clamp on the block, not padding on
  // the cell: fixed cell padding swallows narrow columns whole (DataTable's
  // ~32px expander column left a 0px content box — an invisible skeleton).
  // Columns ≥ 80px get the exact 16px-per-side inset as before; narrower
  // ones keep a visible centered block with a proportional inset instead.
  width: 'max(60%, 100% - 32px)',
  marginInline: 'auto',
  borderRadius: 6,
  background: 'var(--colors-surface-subtle, #f8f9fb)',
  opacity: SKELETON_PULSE_PEAK_OPACITY,
};

export function SkeletonRows({
  rows = 6,
  columns = 6,
  firstColumnTall = true,
  animate = true,
  className,
  style,
}: SkeletonRowsProps = {}) {
  const reducedMotion = usePrefersReducedMotion();
  const shouldAnimate = animate && !reducedMotion;

  return Array.from({ length: rows }, (_row, rowIndex) => (
    <tr key={rowIndex} className={className} style={{ ...rowStyle, ...style }}>
      {Array.from({ length: columns }, (_cell, cellIndex) => (
        <td key={cellIndex} style={cellStyle} aria-hidden="true">
          {/* Injected once, from the first cell, rather than once per block. */}
          {rowIndex === 0 && cellIndex === 0 && shouldAnimate ? (
            <style>{SKELETON_PULSE_KEYFRAMES}</style>
          ) : null}
          <div
            style={{
              ...blockBaseStyle,
              height: cellIndex === 0 && firstColumnTall ? 48 : 32,
              animation: shouldAnimate ? SKELETON_PULSE_ANIMATION : undefined,
            }}
          />
        </td>
      ))}
    </tr>
  ));
}
