import { existsSync, readFileSync } from 'node:fs';
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
 * The root barrel's complete published surface, asserted in BOTH directions:
 * nothing here may disappear without a major version, and nothing may appear
 * at the root without being written down here first.
 *
 * The second direction is the one that needs a reason. This package's surface
 * is a curated slice of visx, kept small on purpose — so a name arriving by
 * accident (an `export *` widened one of the three subpath barrels, an internal
 * helper made public to unblock one call site) is a regression even though
 * nobody loses anything by it. Making the census exact turns every addition
 * into a line in this list, which is a decision somebody has to make on purpose
 * and a reviewer can see.
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
  'EmphasisLayer',
  'EmphasisSeries',
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
  'SyncedChartLegend',
  'SyncedTooltip',
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
  'snapToStop',
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
  'useInteractionStore',
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

/**
 * Every syntactic form that names a module, because the boundary assertions
 * below are only as complete as the set of forms this recognises.
 *
 * `from '...'` alone — the obvious one, and what this walked at first — sees
 * neither of the two ways to reach a module without binding a name from it. A
 * bare `import '@visx/xychart';` and an `import('@visx/xychart')` both put the
 * whole ~83 kB barrel back in the `/core` chunk while every assertion below
 * stays green, which is the one outcome this file is written to prevent. Each
 * pattern is anchored on `import`/`from` immediately before the quote so a
 * module specifier quoted in prose (this package's comments are long) is not
 * mistaken for an edge.
 */
const MODULE_SPECIFIER_PATTERNS = [
  // `import x from '...'`, `import type { X } from '...'`, `export * from '...'`.
  /\bfrom\s*'([^']+)'/g,
  // `import '...';` — evaluated for effect, so it binds no name to match on.
  /\bimport\s+'([^']+)'/g,
  // `import('...')`, with the whitespace the formatter may wrap it across.
  /\bimport\s*\(\s*'([^']+)'/g,
];

/** Every module specifier reachable from `entry` by following relative imports. */
function reachableSpecifiers(entry: string): Set<string> {
  const found = new Set<string>();
  const visited = new Set<string>();

  const visit = (file: string) => {
    if (visited.has(file)) return;
    visited.add(file);
    const source = readFileSync(file, 'utf8');
    const specifiers = MODULE_SPECIFIER_PATTERNS.flatMap((pattern) => [
      ...source.matchAll(pattern),
    ]).map((match) => match[1]!);
    for (const spec of specifiers) {
      if (!spec.startsWith('.')) {
        found.add(spec);
        continue;
      }
      // `./x.js` in source resolves to `./x.ts` or `./x.tsx` on disk.
      const base = resolve(dirname(file), spec.replace(/\.js$/, ''));
      const resolved = ['.ts', '.tsx']
        .map((extension) => base + extension)
        .find((candidate) => existsSync(candidate));
      // Swallowing this would shrink the graph instead of failing: a module
      // moved behind a directory index, or renamed to an extension not tried
      // here, stops being traversed while the bundler still resolves it — and
      // the boundary assertions below then pass on whatever is left, up to and
      // including nothing at all. A traversal that cannot follow an edge has
      // stopped answering the question it was asked.
      if (resolved === undefined) {
        throw new Error(
          `${file} imports '${spec}', which resolves to no .ts or .tsx file. ` +
            'Teach this resolver the new layout — the boundary assertions ' +
            'below are only as complete as the graph it walks.',
        );
      }
      visit(resolved);
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

  it('publish exactly the documented root surface, no more and no less', () => {
    expect(names(root)).toEqual([...PUBLISHED_ROOT_EXPORTS].sort());
  });

  it('bind every name they publish to an actual value', () => {
    // The three tests above compare names, and a name outlives its binding:
    // the subpath barrels re-export by name, so a static
    // `export { nearestStop } from './crosshair.js'` keeps `nearestStop` in
    // `core.ts`'s namespace after `crosshair.tsx` stops exporting it — with
    // `undefined` behind the name, forwarded through the root's `export *`.
    // The partition, the union and the census all still pass on that.
    //
    // `tsc` does reject the dangling re-export, but that is a different
    // guarantee than the one this file advertises. Checked on the root because
    // it is the union of the three: a name unbound in any subpath arrives here
    // unbound.
    const unbound = Object.entries(root)
      .filter(([, value]) => value === undefined)
      .map(([name]) => name);
    expect(unbound).toEqual([]);
  });
});

const packageJson = JSON.parse(
  readFileSync(resolve(SRC_DIR, '..', 'package.json'), 'utf8'),
) as { exports: Record<string, { types: string; default: string }> };

/** `./dist/x.js` — a build output — mapped back to the module it compiles from. */
function sourceModuleFor(distPath: string): string | undefined {
  const stem = distPath.replace(/^\.\/dist\//, '').replace(/\.js$/, '');
  return ['.ts', '.tsx']
    .map((extension) => resolve(SRC_DIR, stem + extension))
    .find((candidate) => existsSync(candidate));
}

/**
 * `package.json` is the only part of the export surface a consumer's install
 * actually resolves through, and nothing else in this repo type-checks it: a
 * subpath added to the manifest but never imported here, or a target path
 * mistyped, fails first in a consumer's node_modules. These close that gap.
 */
describe('package.json exports', () => {
  it('declares exactly the root barrel and the three subpaths', () => {
    expect(Object.keys(packageJson.exports).sort()).toEqual([
      '.',
      './core',
      './primitives',
      './xychart',
    ]);
  });

  it.each(Object.entries(packageJson.exports))(
    '%s resolves to a module that exists',
    (_subpath, target) => {
      // A `types` path that has drifted from `default` is invisible to every
      // other check here: the runtime import keeps working and only the
      // consumer's editor goes quiet.
      expect(target.types).toBe(target.default.replace(/\.js$/, '.d.ts'));
      expect(sourceModuleFor(target.default)).toBeDefined();
    },
  );
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
