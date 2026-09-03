/**
 * `@archon-research/charting/primitives` — hand-composition primitives that
 * need visx, but NOT `@visx/xychart`.
 *
 * A chart that steps off the single-plot `<XYChart>` happy path (faceted
 * small-multiples, a custom stacked area, a sparkline, a sorted distribution)
 * composes from these: scales, shapes, curves, the token-themed standalone
 * axes, and the brush/zoom overlays. Measured cost is the union of the visx
 * packages actually used — `@visx/axis` ~49 kB, `@visx/scale` + `@visx/curve` +
 * `@visx/group` ~50 kB, `@visx/zoom` ~34 kB, `@visx/brush` ~28 kB, `@visx/shape`
 * ~14 kB minified — all well under, and independent of, the ~83 kB
 * `@visx/xychart` floor that `/xychart` carries. Within one import the package
 * is `"sideEffects": false` ESM, so a bundler tree-shakes down to the visx
 * packages a call site really touches; the subpath is what keeps `<XYChart>`
 * out of the chunk entirely.
 *
 * Everything here is also re-exported from the root barrel.
 */

// Low-level visx composition primitives, re-exported so a chart composed by
// hand does not need `@visx/*` as a direct app dependency. (These are already
// `charting` dependencies; this just surfaces them.)
export { Group } from '@visx/group';
export { Area, AreaStack, Bar, Line, LinePath } from '@visx/shape';
export { scaleBand, scaleLinear, scaleTime } from '@visx/scale';

// Curve factories, for the `curve` prop on Line/Area series.
export {
  curveLinear,
  curveMonotoneX,
  curveNatural,
  curveStep,
  curveStepAfter,
  curveStepBefore,
  curveBasis,
} from '@visx/curve';

// Token-themed standalone axes (wrap `@visx/axis`, applying the same tokens as
// `chartTheme`), for composed charts that render their own axes outside XYChart.
export { AxisBottom, AxisLeft, AxisRight, AxisTop } from './axis.js';
export type {
  ThemedAxisBottomProps,
  ThemedAxisLeftProps,
  ThemedAxisRightProps,
  ThemedAxisTopProps,
} from './axis.js';

// Time-range brush + zoom/pan.
export { TimeRangeBrush } from './brush.js';
export type {
  TimeRangeBrushProps,
  TimeRangeBrushDatum,
  TimeRangeBrushDomain,
} from './brush.js';
export { ZoomPanOverlay } from './zoom.js';
export type { ZoomPanOverlayProps, ZoomDomain } from './zoom.js';
