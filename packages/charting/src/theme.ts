/**
 * The token contract every mark in this package styles itself from.
 *
 * Deliberately free of any `@visx/*` import: `@visx/xychart` has no
 * tree-shakable entry below its own barrel, so a single import from it costs
 * ~83 kB minified no matter which symbol is taken. Keeping the tokens here and
 * the `<XYChart>` theme built from them in `xychart-theme.ts` is what lets
 * `ChartLegend`, `ChartDataTable` and the axis styles ship in the
 * `@archon-research/charting/core` subpath without that floor. Add nothing to
 * this module that imports `@visx/*`.
 */
import { chartColorTokens } from './chart-color.js';

/**
 * The series palette keyed by role, as CSS-variable strings. Consumers
 * reference roles (`seriesColor.primary`) rather than a palette index, and
 * `chartTokens.series` derives its order from these, so there are no magic
 * indices to drift if the palette is reordered or resized.
 *
 * Values come from `chartColorTokens` (`chart-color.ts`), which is where the
 * token names and their fallbacks are defined; this map only assigns them
 * short role aliases. `quaternary`/`quinary` continue the ordinal ramp past
 * `tertiary` for charts with more than three non-semantic series.
 */
export const seriesColor = {
  primary: chartColorTokens['chart.series.primary'],
  secondary: chartColorTokens['chart.series.secondary'],
  tertiary: chartColorTokens['chart.series.tertiary'],
  positive: chartColorTokens['chart.series.positive'],
  critical: chartColorTokens['chart.series.critical'],
  quaternary: chartColorTokens['chart.series.quaternary'],
  quinary: chartColorTokens['chart.series.quinary'],
} as const;

/**
 * Single source of truth for chart colors, as CSS-variable strings.
 *
 * These resolve in SVG presentation attributes (the way visx applies series and
 * axis colors) across Chromium, Firefox, and WebKit, and track the active
 * design-system theme via the `_dark` token switch with no runtime resolution.
 * Each non-series token carries a fallback for the same reason as `seriesColor`.
 * See packages/charting/DESIGN.md.
 */
export const chartTokens = {
  // Ordered palette visx consumes; roles are owned by `seriesColor` above.
  // Deliberately the five original roles: this array indexes visx's ordinal
  // color assignment, so appending `quaternary`/`quinary` would re-color
  // existing six-plus-series charts. Pass an explicit `colors` to
  // `buildChartTheme` (or a per-series color prop) to use them.
  series: [
    seriesColor.primary,
    seriesColor.secondary,
    seriesColor.tertiary,
    seriesColor.positive,
    seriesColor.critical,
  ],
  areaPrimary: chartColorTokens['chart.area.primary'],
  axis: chartColorTokens['chart.axis'],
  grid: chartColorTokens['chart.grid'],
  surface: 'var(--colors-surface-default, #ffffff)',
  label: 'var(--colors-text-muted, #667085)',
  /**
   * Alpha-tinted semantic fill for a one-sided threshold breach (the region
   * past a reference line). A `color-mix` tint of the same `critical` token
   * used elsewhere, not a distinct color family — see `ReferenceBand` in
   * `reference-band.tsx`.
   */
  breachFill: `color-mix(in srgb, ${chartColorTokens['chart.series.critical']} 14%, transparent)`,
  /**
   * Alpha-tinted semantic fill for a symmetric/asymmetric confidence band.
   * Tints the `tertiary` series token so bands read as a distinct family
   * from the breach fill above.
   */
  bandFill: `color-mix(in srgb, ${chartColorTokens['chart.series.tertiary']} 16%, transparent)`,
} as const;

/**
 * Axis styling, extracted so a hand-composed chart using the token-themed
 * standalone `AxisBottom`/`AxisLeft` wrappers renders the SAME axis as an
 * `<XYChart>` does — one source of truth feeds both the visx XYChart theme
 * (`xychart-theme.ts`) and the wrappers (see `axis.tsx`). Kept as plain values (not a
 * `buildChartTheme` result) because the standalone `@visx/axis` components take
 * individual `stroke` / `tickLabelProps` / `labelProps` and don't read the
 * XYChart theme context.
 */
export const AXIS_TICK_LENGTH = 6;
/** Tick-value label style (small, muted). */
export const axisTickLabelStyle = { fill: chartTokens.label, fontSize: 11 };
/** Axis (unit) label style (larger, axis color). */
export const axisLabelStyle = { fill: chartTokens.axis, fontSize: 12 };
/** Axis + tick line stroke. */
export const axisLineStyle = { stroke: chartTokens.axis };
