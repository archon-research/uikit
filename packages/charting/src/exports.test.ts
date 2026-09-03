import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import * as core from './core.js';
import * as root from './index.js';
import * as primitives from './primitives.js';
import * as xychart from './xychart.js';

/**
 * The three subpath barrels partition this package: every name belongs to
 * exactly one of them, and the root barrel is their union. Consumers import
 * from the root today, so a subpath that quietly stops re-exporting something —
 * or a name added to a subpath but never surfaced at the root — is the failure
 * mode these tests exist to catch.
 *
 * Type-only exports are erased at runtime and so are not listed here; `tsc`
 * covers them, because the root barrel `export *`s the same three modules that
 * declare them.
 */

/**
 * Every value the root barrel exported before it was split into subpaths.
 * The root barrel is public API: it may grow, but nothing here may disappear
 * from it without a major version.
 */
const PUBLISHED_ROOT_EXPORTS = [
  'AnimatedAreaSeries',
  'AnimatedAreaStack',
  'AnimatedAxis',
  'AnimatedBarGroup',
  'AnimatedBarSeries',
  'AnimatedBarStack',
  'AnimatedGlyphSeries',
  'AnimatedGrid',
  'AnimatedLineSeries',
  'Area',
  'AreaSeries',
  'AreaStack',
  'Axis',
  'AxisBottom',
  'AxisLeft',
  'AxisRight',
  'AxisTop',
  'Bar',
  'BarGroup',
  'BarSeries',
  'BarStack',
  'CandlestickSeries',
  'ChartCursorLayer',
  'ChartDataTable',
  'ChartLegend',
  'Crosshair',
  'DEFAULT_BIN_COUNT',
  'DOWNSAMPLE_THRESHOLD',
  'DashboardInteractionProvider',
  'DataContext',
  'DirectLabels',
  'DistributionSeries',
  'DragSelectionOverlay',
  'EventEmitterProvider',
  'FALLBACK_CHART_WIDTH',
  'GlyphSeries',
  'Grid',
  'Group',
  'HistogramSeries',
  'Line',
  'LinePath',
  'LineSeries',
  'ReferenceBand',
  'ResponsiveChart',
  'Swatch',
  'SyncedChartGroup',
  'TimeRangeBrush',
  'Tooltip',
  'XYChart',
  'ZoomPanOverlay',
  'axisLabelStyle',
  'axisTickLabelStyle',
  'buildChartTheme',
  'chartColorToken',
  'chartColorTokens',
  'chartTheme',
  'chartTokens',
  'curveBasis',
  'curveLinear',
  'curveMonotoneX',
  'curveNatural',
  'curveStep',
  'curveStepAfter',
  'curveStepBefore',
  'deriveLeftMargin',
  'downsample',
  'histogramBins',
  'lttb',
  'minMaxPerPixel',
  'nearestStop',
  'resolveChartColor',
  'resolveLabelPositions',
  'scaleBand',
  'scaleLinear',
  'scaleTime',
  'seriesColor',
  'sortDistribution',
  'useChartDimensions',
  'useContainerWidth',
  'useDashboardFilter',
  'useDashboardInteraction',
  'useHiddenKeys',
  'useHighlightedKey',
  'useHoveredTimestamp',
  'useInteractionDispatch',
  'useInteractionSetters',
  'useInteractionValue',
  'useSelectedTimeRange',
  'useSetHiddenKeys',
  'useSetHighlightedKey',
  'useSetHoveredTimestamp',
  'useSyncedCursor',
  'useSyncedCursorHandlers',
  'useTimeRangeBrushGesture',
  'useToggleHiddenKey',
];

const names = (mod: object) => Object.keys(mod).sort();

const SRC_DIR = dirname(fileURLToPath(import.meta.url));

/** Every module specifier reachable from `entry` by following relative imports. */
function reachableSpecifiers(entry: string): Set<string> {
  const found = new Set<string>();
  const visited = new Set<string>();

  const visit = (file: string) => {
    if (visited.has(file)) return;
    visited.add(file);
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/from '([^']+)'/g)) {
      const spec = match[1]!;
      if (!spec.startsWith('.')) {
        found.add(spec);
        continue;
      }
      // `./x.js` in source resolves to `./x.ts` or `./x.tsx` on disk.
      const base = resolve(dirname(file), spec.replace(/\.js$/, ''));
      for (const ext of ['.ts', '.tsx']) {
        try {
          readFileSync(base + ext, 'utf8');
          visit(base + ext);
          break;
        } catch {
          // try the next extension
        }
      }
    }
  };

  visit(resolve(SRC_DIR, entry));
  return found;
}

describe('subpath barrels', () => {
  it('partition the package: no name appears in two subpaths', () => {
    const all = [...names(core), ...names(primitives), ...names(xychart)];
    const duplicates = all.filter((name, i) => all.indexOf(name) !== i);
    expect(duplicates).toEqual([]);
  });

  it('add up to exactly the root barrel', () => {
    const union = [
      ...new Set([...names(core), ...names(primitives), ...names(xychart)]),
    ].sort();
    expect(union).toEqual(names(root));
  });

  it('never drop a name the root barrel already published', () => {
    expect(names(root)).toEqual(expect.arrayContaining(PUBLISHED_ROOT_EXPORTS));
  });
});

describe('subpath dependency boundaries', () => {
  // The point of the split, asserted on the module graph rather than on bundle
  // size so it fails at review time instead of in a consumer's chunk report.
  it('keeps `./core` free of every @visx package', () => {
    const visx = [...reachableSpecifiers('core.ts')].filter((spec) =>
      spec.startsWith('@visx/'),
    );
    expect(visx).toEqual([]);
  });

  it('keeps `./primitives` free of @visx/xychart', () => {
    // `@visx/xychart` publishes one barrel entry and nothing below it, so a
    // single import from it costs ~83 kB minified whatever symbol is taken.
    // Keeping it out of `/primitives` is what makes a hand-composed chart
    // cheaper than an `<XYChart>` one.
    const specs = reachableSpecifiers('primitives.ts');
    expect(
      [...specs].filter((spec) => spec.startsWith('@visx/')),
    ).not.toContain('@visx/xychart');
  });
});
