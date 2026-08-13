import {
  AxisBottom as VisxAxisBottom,
  AxisLeft as VisxAxisLeft,
  AxisRight as VisxAxisRight,
  AxisTop as VisxAxisTop,
} from '@visx/axis';
import type { ComponentProps } from 'react';

import {
  AXIS_TICK_LENGTH,
  axisLabelStyle,
  axisTickLabelStyle,
  chartTokens,
} from './theme.js';

/**
 * Token-themed wrappers over the standalone `@visx/axis` components.
 *
 * The XYChart `<Axis>` reads its styling from the chart theme context, but the
 * standalone axes (which a hand-composed, off-`XYChart` chart needs — a faceted
 * timeline, a custom-scaled plot) do not: they take individual `stroke` /
 * `tickLabelProps` / `labelProps`, defaulting to unthemed black. These wrappers
 * apply the same design tokens `chartTheme` uses (`theme.ts`), so a composed
 * chart's axis matches an `<XYChart>`'s without re-declaring `var(--colors-*)`
 * at the call site. Every visx prop is forwarded and overrides the default, so
 * `<AxisBottom scale={x} tickFormat={fmt} numTicks={6} />` works as usual and
 * `tickLabelProps` / `stroke` can still be overridden per call.
 */

export type ThemedAxisBottomProps = ComponentProps<typeof VisxAxisBottom>;
export type ThemedAxisTopProps = ComponentProps<typeof VisxAxisTop>;
export type ThemedAxisLeftProps = ComponentProps<typeof VisxAxisLeft>;
export type ThemedAxisRightProps = ComponentProps<typeof VisxAxisRight>;

// Per-orientation tick-label anchors (visx replaces, not merges, its default
// tickLabelProps when one is supplied, so the anchors are set here too).
const horizontalTickLabelProps = {
  ...axisTickLabelStyle,
  textAnchor: 'middle',
  verticalAnchor: 'start',
} as const;
const topTickLabelProps = {
  ...axisTickLabelStyle,
  textAnchor: 'middle',
  verticalAnchor: 'end',
} as const;
const leftTickLabelProps = {
  ...axisTickLabelStyle,
  textAnchor: 'end',
  verticalAnchor: 'middle',
} as const;
const rightTickLabelProps = {
  ...axisTickLabelStyle,
  textAnchor: 'start',
  verticalAnchor: 'middle',
} as const;

export function AxisBottom(props: ThemedAxisBottomProps) {
  return (
    <VisxAxisBottom
      stroke={chartTokens.axis}
      tickStroke={chartTokens.axis}
      tickLength={AXIS_TICK_LENGTH}
      tickLabelProps={horizontalTickLabelProps}
      labelProps={axisLabelStyle}
      {...props}
    />
  );
}

export function AxisTop(props: ThemedAxisTopProps) {
  return (
    <VisxAxisTop
      stroke={chartTokens.axis}
      tickStroke={chartTokens.axis}
      tickLength={AXIS_TICK_LENGTH}
      tickLabelProps={topTickLabelProps}
      labelProps={axisLabelStyle}
      {...props}
    />
  );
}

export function AxisLeft(props: ThemedAxisLeftProps) {
  return (
    <VisxAxisLeft
      stroke={chartTokens.axis}
      tickStroke={chartTokens.axis}
      tickLength={AXIS_TICK_LENGTH}
      tickLabelProps={leftTickLabelProps}
      labelProps={axisLabelStyle}
      {...props}
    />
  );
}

export function AxisRight(props: ThemedAxisRightProps) {
  return (
    <VisxAxisRight
      stroke={chartTokens.axis}
      tickStroke={chartTokens.axis}
      tickLength={AXIS_TICK_LENGTH}
      tickLabelProps={rightTickLabelProps}
      labelProps={axisLabelStyle}
      {...props}
    />
  );
}
