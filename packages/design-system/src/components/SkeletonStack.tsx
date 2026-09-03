import { type CSSProperties } from 'react';

import { usePrefersReducedMotion } from '../hooks/useMediaQuery.js';
import {
  SKELETON_FILL,
  SKELETON_PULSE_ANIMATION,
  SKELETON_PULSE_KEYFRAMES,
  SKELETON_PULSE_PEAK_OPACITY,
} from './skeletonPulse.js';

export type SkeletonStackProps = {
  count?: number;
  itemHeight?: number;
  /** Pulses each item to signal loading. Default true; suppressed under `prefers-reduced-motion`. */
  animate?: boolean;
  /**
   * Applied to the wrapper. To re-tone the items, set `--skeleton-fill` here —
   * it inherits down to them, and they read it rather than hardcoding a colour
   * (see `SKELETON_FILL_VAR`).
   */
  className?: string;
  /** Applied to the wrapper; `--skeleton-fill` set here also reaches the items. */
  style?: CSSProperties;
};

const wrapperStyle: CSSProperties = {
  display: 'grid',
  gap: 12,
};

const itemBaseStyle: CSSProperties = {
  borderRadius: 8,
  background: SKELETON_FILL,
  opacity: SKELETON_PULSE_PEAK_OPACITY,
};

export function SkeletonStack({
  count = 6,
  itemHeight = 64,
  animate = true,
  className,
  style,
}: SkeletonStackProps = {}) {
  const reducedMotion = usePrefersReducedMotion();
  const shouldAnimate = animate && !reducedMotion;

  return (
    <div className={className} style={{ ...wrapperStyle, ...style }}>
      {shouldAnimate ? <style>{SKELETON_PULSE_KEYFRAMES}</style> : null}
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          style={{
            ...itemBaseStyle,
            height: itemHeight,
            animation: shouldAnimate ? SKELETON_PULSE_ANIMATION : undefined,
          }}
        />
      ))}
    </div>
  );
}
