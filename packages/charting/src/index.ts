export { ChartContainer } from './ChartContainer';
export { LineChart } from './LineChart';
export { BarChart } from './BarChart';
export { Sparkline } from './Sparkline';
export type { BaseChartProps, ChartDatum, ChartMargins } from './types';

// Token-driven theme contract (see DESIGN.md).
export { chartTheme, chartTokens } from './theme';

// Curated visx surface, so consumers depend on this package, not @visx/* directly.
export {
  XYChart,
  Axis,
  Grid,
  Tooltip,
  LineSeries,
  AreaSeries,
  BarSeries,
  BarGroup,
  BarStack,
  GlyphSeries,
  buildChartTheme,
} from '@visx/xychart';
