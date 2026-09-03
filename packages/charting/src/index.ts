/**
 * The root barrel: the union of the three subpath barrels, so importing from
 * `@archon-research/charting` still reaches every export this package has.
 *
 * The subpaths exist so a consumer can pick a chunk boundary without a wrapper
 * module, and they are derived from the dependency graph rather than from
 * taste:
 *
 * - `./core` — no `@visx/*` import at all (~6 kB minified): tokens, colors,
 *   legend, data-table fallback, crosshair line, responsive sizing,
 *   downsampling.
 * - `./primitives` — visx, but not `@visx/xychart` (~14-50 kB minified per
 *   visx package actually used): scales, shapes, curves, themed standalone
 *   axes, brush, zoom.
 * - `./xychart` — `<XYChart>` and every mark that reads its `DataContext`.
 *   `@visx/xychart` has no entry below its own barrel, so any import from it
 *   costs ~83 kB minified before tree-shaking; this is the subpath to load
 *   lazily.
 *
 * Each name lives in exactly one of the three, so this file is a plain union
 * and `charting-exports.test.ts` holds that invariant.
 */
export * from './core.js';
export * from './primitives.js';
export * from './xychart.js';
