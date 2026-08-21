import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  chartColorToken,
  chartColorTokens,
  resolveChartColor,
  type ChartColor,
  type ChartColorToken,
} from './chart-color.js';
import { chartTokens, seriesColor } from './theme.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('chartColorToken', () => {
  it('maps a token path to its CSS variable, with a fallback', () => {
    expect(chartColorToken('chart.series.primary')).toBe(
      'var(--colors-chart-series-primary, #155eef)',
    );
    expect(chartColorToken('chart.grid')).toBe(
      'var(--colors-chart-grid, #e5e7eb)',
    );
    expect(chartColorToken('identity.6')).toBe(
      'var(--colors-identity-6, #0891b2)',
    );
  });
});

describe('resolveChartColor', () => {
  it('resolves every known token to the same string the role aliases use', () => {
    // The token form and the pre-existing `seriesColor.*`/`chartTokens.*` form
    // are the SAME string, which is what makes a story converted to token names
    // render pixel-identically.
    expect(resolveChartColor('chart.series.primary')).toBe(seriesColor.primary);
    expect(resolveChartColor('chart.series.quinary')).toBe(seriesColor.quinary);
    expect(resolveChartColor('chart.axis')).toBe(chartTokens.axis);
    expect(resolveChartColor('chart.grid')).toBe(chartTokens.grid);
    expect(resolveChartColor('chart.area.primary')).toBe(
      chartTokens.areaPrimary,
    );
  });

  it('resolves every token in the table', () => {
    for (const path of Object.keys(chartColorTokens) as ChartColorToken[]) {
      expect(resolveChartColor(path), path).toBe(chartColorTokens[path]);
    }
  });

  it('passes a raw color string through untouched', () => {
    expect(resolveChartColor('#ff0000')).toBe('#ff0000');
    expect(resolveChartColor('rebeccapurple')).toBe('rebeccapurple');
    expect(resolveChartColor('url(#series-gradient)')).toBe(
      'url(#series-gradient)',
    );
    // What `useIdentityPalette` returns.
    expect(resolveChartColor('var(--colors-identity-3)')).toBe(
      'var(--colors-identity-3)',
    );
  });

  it('does not resolve inherited object properties', () => {
    // A guard against `chartColorTokens[color]` walking the prototype chain and
    // returning a function for e.g. `'toString'`.
    expect(resolveChartColor('toString')).toBe('toString');
    expect(resolveChartColor('constructor')).toBe('constructor');
  });
});

describe('the dev-time unknown-token guard', () => {
  it('warns for a misspelled token PATH, which the type lets compile', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Not a compile error: the `(string & {})` arm of `ChartColor` makes any
    // string legal, which is precisely why this runtime check has to exist.
    const typo: ChartColor = 'chart.series.primry';
    // The guard reports the value; it does not repair it, so the bad path still
    // reaches the SVG attribute verbatim.
    expect(resolveChartColor(typo)).toBe(typo);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('chart.series.primry');
  });

  it('warns for a path in the identity namespace that is not a token', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    resolveChartColor('identity.nine');
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('warns only once per offending path', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const typo = 'chart.grd';
    resolveChartColor(typo);
    resolveChartColor(typo);
    resolveChartColor(typo);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('stays silent for a value not shaped like a token path', () => {
    // The path check fires on anything starting `chart.` / `identity.`, so what
    // it must never touch is every OTHER form a `ChartColor` legitimately takes.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    resolveChartColor('#ff0000');
    resolveChartColor('rebeccapurple');
    resolveChartColor('url(#series-gradient)');
    resolveChartColor('color-mix(in srgb, red 14%, transparent)');
    resolveChartColor('chart.series.primary');
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns for a var() naming a chart token that does not exist', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    resolveChartColor('var(--colors-chart-series-primry, #155eef)');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('--colors-chart-series-primry');
  });

  it('warns for an unknown identity slot', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    resolveChartColor('var(--colors-identity-99)');
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('warns only once per offending custom property', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const typo = 'var(--colors-chart-series-secondry)';
    resolveChartColor(typo);
    resolveChartColor(typo);
    resolveChartColor(typo);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('stays silent for known chart tokens passed as raw var() strings', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    resolveChartColor(seriesColor.primary);
    resolveChartColor(chartTokens.grid);
    resolveChartColor('var(--colors-identity-4)');
    expect(warn).not.toHaveBeenCalled();
  });

  it('stays silent outside the chart and identity namespaces', () => {
    // Charting cannot know the design system's full color namespace, so a
    // surface/text token — or any other var() — must not be second-guessed.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    resolveChartColor(chartTokens.surface);
    resolveChartColor(chartTokens.label);
    resolveChartColor(chartTokens.breachFill);
    resolveChartColor('var(--colors-brand-accent)');
    resolveChartColor('var(--spacing-4)');
    expect(warn).not.toHaveBeenCalled();
  });

  it('is compiled out of production builds', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();
    const production = await import('./chart-color.js');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    production.resolveChartColor('var(--colors-chart-series-typo-in-prod)');
    production.resolveChartColor('chart.series.typo-in-prod');
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('the ChartColor type', () => {
  it('accepts every known token name', () => {
    // Each entry is checked against the union, so a token dropped from the
    // table turns the corresponding line into a compile error.
    const tokens: ChartColorToken[] = [
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
    ];
    expect(tokens).toHaveLength(Object.keys(chartColorTokens).length);
  });

  it('rejects a token name that does not exist', () => {
    // Where the NARROW type is the annotation, a typo is a compile error. On a
    // `ChartColor` prop it is not — see the dev-time guard above, which is what
    // covers that gap.
    // @ts-expect-error -- not a member of the token union.
    const typo: ChartColorToken = 'chart.series.primry';
    // @ts-expect-error -- a plausible-but-wrong path shape is caught too.
    const wrongShape: ChartColorToken = 'chart.series.1';
    expect([typo, wrongShape]).toHaveLength(2);
  });

  it('still accepts an arbitrary string as the escape hatch', () => {
    const raw: ChartColor = '#0f766e';
    const computed: ChartColor = `var(--colors-identity-${1 + 2})`;
    const token: ChartColor = 'chart.series.tertiary';
    expect([raw, computed, token]).toHaveLength(3);
  });
});
