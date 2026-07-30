import type { HTMLAttributes, ReactNode } from 'react';

export type IndicatorStatus = 'idle' | 'ready' | 'active' | 'pending' | 'error';
export type IndicatorColorPalette =
  | 'neutral'
  | 'gray'
  | 'green'
  | 'red'
  | 'amber'
  | 'blue';

type IndicatorProps = HTMLAttributes<HTMLSpanElement> & {
  /** Semantic state: drives the dot colour (via colorPalette) and pulse. */
  status?: IndicatorStatus;
  /** Overrides the hue picked by `status` (the pulse still follows `status`). */
  colorPalette?: IndicatorColorPalette;
  /** Optional label rendered next to the dot. */
  children?: ReactNode;
  /** Dot diameter in px (defaults to the recipe's 8px). */
  size?: number;
};

/**
 * Class names emitted by the `indicator` slot recipe (registered in the preset
 * + staticCss). The design-system builds with `tsc` and ships no generated
 * `styled-system`, so the recipe is applied by its stable slot class names
 * (base `indicator__${slot}`, slot variant `indicator__${slot}--${key}_${value}`).
 * Consumer `className` composes LAST.
 */
const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

/**
 * A small status dot, optionally with a label. Use for connection state and
 * other at-a-glance liveness signals. The `pending` status pulses (via the
 * `indicatorPulse` animation token) to read as "in transition". Colour comes
 * from dark-aware `colorPalette` role tokens, so the dot flips correctly in
 * dark mode.
 */
export function Indicator({
  status = 'idle',
  colorPalette,
  size,
  children,
  className,
  style,
  ...props
}: IndicatorProps) {
  return (
    <span
      {...props}
      className={cx(
        'indicator__root',
        `indicator__root--status_${status}`,
        // Declared after `status` in the recipe, so an explicit hue overrides
        // the status mapping in the cascade while `status` keeps the pulse.
        colorPalette && `indicator__root--colorPalette_${colorPalette}`,
        className,
      )}
      style={style}
      data-scope="indicator"
      data-part="root"
      data-status={status}
      data-color-palette={colorPalette}
    >
      <span
        className={cx(
          'indicator__dot',
          status === 'pending' && 'indicator__dot--status_pending',
        )}
        data-part="dot"
        style={size !== undefined ? { width: size, height: size } : undefined}
      />
      {children}
    </span>
  );
}
