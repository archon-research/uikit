/**
 * The `<XYChart>` half of the theme contract: the token-resolving
 * `buildChartTheme` wrapper and the ready-made `chartTheme` built from
 * `theme.ts`'s tokens. Split from `theme.ts` because it imports
 * `@visx/xychart` — see that module's header for why that boundary matters.
 */
import { buildChartTheme as visxBuildChartTheme } from '@visx/xychart';

import { resolveChartColor, type ChartColor } from './chart-color.js';
import {
  AXIS_TICK_LENGTH,
  axisLabelStyle,
  axisLineStyle,
  axisTickLabelStyle,
  chartTokens,
} from './theme.js';

/**
 * visx's own `buildChartTheme` config, derived from its signature rather than
 * restated (`@visx/xychart` does not export `ThemeConfig`).
 */
type VisxThemeConfig = Parameters<typeof visxBuildChartTheme>[0];
type VisxTextStyles = NonNullable<VisxThemeConfig['svgLabelBig']>;
type VisxLineStyles = NonNullable<VisxThemeConfig['xAxisLineStyles']>;

/** A `svgLabel*` block as authored here: visx's, with a {@link ChartColor} fill. */
type ChartTextStyles = Omit<VisxTextStyles, 'fill'> & { fill?: ChartColor };
/** A `*LineStyles` block as authored here: visx's, with a {@link ChartColor} stroke. */
type ChartLineStyles = Omit<VisxLineStyles, 'stroke'> & { stroke?: ChartColor };

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
  svgLabelBig?: ChartTextStyles;
  svgLabelSmall?: ChartTextStyles;
  xAxisLineStyles?: ChartLineStyles;
  yAxisLineStyles?: ChartLineStyles;
  xTickLineStyles?: ChartLineStyles;
  yTickLineStyles?: ChartLineStyles;
};

/**
 * Resolves the `fill` of a label style block, leaving other keys untouched.
 *
 * WHY THE `in` CHECK: visx's `buildChartTheme` merges each style block by
 * SPREADING it over its own defaults (`{ ...defaults, fill: textColor,
 * ...config.svgLabelBig }`), so a `fill` key present with the value `undefined`
 * overwrites the default text color with nothing rather than falling back to it.
 * Writing the key back only when the input carried it is what keeps
 * `svgLabelBig: { fontSize: 14 }` a font-size override instead of also blanking
 * the themed fill. A `fill` the caller explicitly set to `undefined` IS
 * forwarded: this wrapper translates token names and changes nothing else, so
 * such a config behaves as it would against visx's function directly.
 */
function resolveTextStyles(
  styles: ChartTextStyles | undefined,
): VisxTextStyles | undefined {
  if (!styles || !('fill' in styles)) return styles;
  const { fill, ...rest } = styles;
  return {
    ...rest,
    fill: fill === undefined ? undefined : resolveChartColor(fill),
  };
}

/**
 * Resolves the `stroke` of an axis/tick line style block. Same key-presence rule
 * as {@link resolveTextStyles} — visx spreads these over `gridColor` /
 * `gridColorDark` defaults, so `{ strokeWidth: 3 }` must not carry a `stroke`.
 */
function resolveLineStyles(
  styles: ChartLineStyles | undefined,
): VisxLineStyles | undefined {
  if (!styles || !('stroke' in styles)) return styles;
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
