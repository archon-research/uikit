import { describe, expect, it } from 'vitest';

import {
  chartColorCssVarName,
  chartColorSemanticTokens,
  chartColorTokenPaths,
  type ChartColorTokenPath,
} from './chartColorTokens.js';

/**
 * The runtime half of the leaf definition: a node carrying a `value`. Must stay
 * identical to the module's `ChartColorTokenLeaf` — the two disagreeing is the
 * failure the first test below exists to catch, so it must not be re-derived
 * more strictly here.
 */
function isTokenLeaf(node: unknown): boolean {
  return typeof node === 'object' && node !== null && 'value' in node;
}

/** Depth-first dotted leaf paths of the token tree, in declaration order. */
function walkTokenPaths(node: object, prefix = ''): string[] {
  return Object.entries(node).flatMap(([key, child]) => {
    const path = prefix === '' ? key : `${prefix}.${key}`;
    return isTokenLeaf(child) ? [path] : walkTokenPaths(child as object, path);
  });
}

describe('chartColorTokenPaths', () => {
  // THE pin between the tree and the published list, and the only check that can
  // see leaf-definition drift. `chartColorTokenPaths` is written out and checked
  // against `ChartColorTokenPath` by its annotation, so a path the union does
  // not contain fails to compile; this walk covers the other direction — a token
  // the TREE has and the list does not.
  //
  // That other direction is not decoration. If `ChartColorTokenLeaf` and
  // `isTokenLeaf` ever disagree, the offending token drops out of the union
  // silently (see the note on `ChartColorTokenLeaf`), so no annotation and no
  // exhaustiveness check at the type level can report it. This walk can: it is
  // the one place the tree is enumerated without going through the union.
  it('is exactly the leaf paths of the token tree, in declaration order', () => {
    expect(chartColorTokenPaths).toEqual(
      walkTokenPaths(chartColorSemanticTokens),
    );
  });

  it('resolves every path to a dark-aware token leaf', () => {
    for (const path of chartColorTokenPaths) {
      const leaf = path
        .split('.')
        .reduce<unknown>(
          (node, segment) => (node as Record<string, unknown>)[segment],
          chartColorSemanticTokens,
        );
      const tokenRef = expect.stringMatching(/^\{colors\./) as unknown;
      expect(leaf, path).toMatchObject({
        value: { base: tokenRef, _dark: tokenRef },
      });
    }
  });
});

describe('chartColorCssVarName', () => {
  it('flattens a token path onto the colors namespace', () => {
    expect(chartColorCssVarName('chart.series.primary')).toBe(
      '--colors-chart-series-primary',
    );
    expect(chartColorCssVarName('chart.area.primary')).toBe(
      '--colors-chart-area-primary',
    );
    expect(chartColorCssVarName('chart.axis')).toBe('--colors-chart-axis');
    expect(chartColorCssVarName('identity.8')).toBe('--colors-identity-8');
  });

  it('rejects a path that is not a known token', () => {
    // @ts-expect-error -- a typo'd token path is a compile error, which is the
    // entire point of the union: it cannot reach CSS as an unresolved var().
    chartColorCssVarName('chart.series.primry');
  });
});

describe('ChartColorTokenPath', () => {
  it('is derived from the token tree, not restated', () => {
    // Compiles only if the union covers these exact members; a token removed
    // from the tree above turns each corresponding line into an error.
    const covered: ChartColorTokenPath[] = [
      'chart.axis',
      'chart.grid',
      'chart.area.primary',
      'chart.series.quinary',
      'identity.1',
    ];
    expect(covered).toHaveLength(5);
  });
});
