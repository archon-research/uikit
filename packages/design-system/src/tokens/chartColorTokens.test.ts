import { describe, expect, it } from 'vitest';

import {
  chartColorCssVarName,
  chartColorSemanticTokens,
  chartColorTokenPaths,
  type ChartColorTokenPath,
} from './chartColorTokens.js';

describe('chartColorTokenPaths', () => {
  // Pinned literally: this list is the published token contract, mirrored by
  // `ChartColorToken` in `@archon-research/charting`. A token added or renamed
  // above must be a deliberate, reviewed edit here (and in charting), not a
  // silent widening of the contract.
  it('enumerates every chart and identity token path', () => {
    expect(chartColorTokenPaths).toEqual([
      'chart.axis',
      'chart.grid',
      'chart.area.primary',
      'chart.series.primary',
      'chart.series.secondary',
      'chart.series.tertiary',
      'chart.series.positive',
      'chart.series.critical',
      'chart.series.quaternary',
      'chart.series.quinary',
      'identity.1',
      'identity.2',
      'identity.3',
      'identity.4',
      'identity.5',
      'identity.6',
      'identity.7',
      'identity.8',
    ]);
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
