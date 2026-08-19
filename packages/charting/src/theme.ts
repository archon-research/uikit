import { buildChartTheme as visxBuildChartTheme } from '@visx/xychart';

import {
  chartColorTokens,
  resolveChartColor,
  type ChartColor,
} from './chart-color.js';

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
 * (below) and the wrappers (see `axis.tsx`). Kept as plain values (not a
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

/**
 * visx's own `buildChartTheme` config, derived from its signature rather than
 * restated (`@visx/xychart` does not export `ThemeConfig`).
 */
type VisxThemeConfig = Parameters<typeof visxBuildChartTheme>[0];
type VisxTextStyles = NonNullable<VisxThemeConfig['svgLabelBig']>;
type VisxLineStyles = NonNullable<VisxThemeConfig['xAxisLineStyles']>;

/**
 * {@link buildChartTheme}'s config: visx's, with every color field widened to
 * {@link ChartColor} so a theme can be described in token names.
 */
export type ChartThemeConfig = Omit<
  VisxThemeConfig,
  | 'backgroundColor'
  | 'colors'
  | 'gridColor'
  | 'gridColorDark'
  | 'svgLabelBig'
  | 'svgLabelSmall'
  | 'xAxisLineStyles'
  | 'yAxisLineStyles'
  | 'xTickLineStyles'
  | 'yTickLineStyles'
> & {
  backgroundColor: ChartColor;
  /** Ordinal palette assigned to series by `dataKey` order. */
  colors: ChartColor[];
  gridColor: ChartColor;
  gridColorDark: ChartColor;
  svgLabelBig?: Omit<VisxTextStyles, 'fill'> & { fill?: ChartColor };
  svgLabelSmall?: Omit<VisxTextStyles, 'fill'> & { fill?: ChartColor };
  xAxisLineStyles?: Omit<VisxLineStyles, 'stroke'> & { stroke?: ChartColor };
  yAxisLineStyles?: Omit<VisxLineStyles, 'stroke'> & { stroke?: ChartColor };
  xTickLineStyles?: Omit<VisxLineStyles, 'stroke'> & { stroke?: ChartColor };
  yTickLineStyles?: Omit<VisxLineStyles, 'stroke'> & { stroke?: ChartColor };
};

/** Resolves the `fill` of a label style block, leaving other keys untouched. */
function resolveTextStyles<T extends { fill?: ChartColor }>(
  styles: T | undefined,
): (Omit<T, 'fill'> & { fill?: string }) | undefined {
  if (!styles) return undefined;
  const { fill, ...rest } = styles;
  return {
    ...rest,
    fill: fill === undefined ? undefined : resolveChartColor(fill),
  };
}

/** Resolves the `stroke` of an axis/tick line style block. */
function resolveLineStyles<T extends { stroke?: ChartColor }>(
  styles: T | undefined,
): (Omit<T, 'stroke'> & { stroke?: string }) | undefined {
  if (!styles) return undefined;
  const { stroke, ...rest } = styles;
  return {
    ...rest,
    stroke: stroke === undefined ? undefined : resolveChartColor(stroke),
  };
}

/**
 * `buildChartTheme` from `@visx/xychart`, wrapped so every color in the config
 * accepts a {@link ChartColor} — a checked token name or any raw string — and is
 * resolved to its `var(...)` form before visx sees it. Raw-string configs behave
 * exactly as they did against visx's function directly.
 *
 * ```tsx
 * const theme = buildChartTheme({
 *   backgroundColor: 'transparent',
 *   colors: ['chart.series.primary', 'chart.series.secondary'],
 *   gridColor: 'chart.grid',
 *   gridColorDark: 'chart.grid',
 *   tickLength: 6,
 * });
 * ```
 */
export function buildChartTheme(config: ChartThemeConfig) {
  return visxBuildChartTheme({
    ...config,
    backgroundColor: resolveChartColor(config.backgroundColor),
    colors: config.colors.map(resolveChartColor),
    gridColor: resolveChartColor(config.gridColor),
    gridColorDark: resolveChartColor(config.gridColorDark),
    svgLabelBig: resolveTextStyles(config.svgLabelBig),
    svgLabelSmall: resolveTextStyles(config.svgLabelSmall),
    xAxisLineStyles: resolveLineStyles(config.xAxisLineStyles),
    yAxisLineStyles: resolveLineStyles(config.yAxisLineStyles),
    xTickLineStyles: resolveLineStyles(config.xTickLineStyles),
    yTickLineStyles: resolveLineStyles(config.yTickLineStyles),
  });
}

/** Token-driven theme for `<XYChart theme={chartTheme}>`. */
export const chartTheme = buildChartTheme({
  backgroundColor: 'transparent',
  colors: [...chartTokens.series],
  gridColor: chartTokens.grid,
  // Light/dark is handled by the CSS variable itself, so the dark variant
  // intentionally points at the same token rather than a separate color.
  gridColorDark: chartTokens.grid,
  tickLength: AXIS_TICK_LENGTH,
  svgLabelSmall: axisTickLabelStyle,
  svgLabelBig: axisLabelStyle,
  xAxisLineStyles: axisLineStyle,
  yAxisLineStyles: axisLineStyle,
  xTickLineStyles: axisLineStyle,
  yTickLineStyles: axisLineStyle,
});
