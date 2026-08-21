import { describe, expect, it } from 'vitest';

import { seriesColor, buildChartTheme, chartTokens } from './theme.js';
import type { ChartThemeConfig } from './theme.js';

/**
 * The smallest config `buildChartTheme` accepts, carrying NO style blocks. Every
 * test below builds a theme from it twice — once bare, once with one partial
 * style block — and compares, so the assertions never restate a visx default.
 */
const baseConfig: ChartThemeConfig = {
  backgroundColor: 'transparent',
  colors: ['chart.series.primary', 'chart.series.secondary'],
  gridColor: 'chart.grid',
  gridColorDark: 'chart.axis',
  tickLength: 6,
};

describe('buildChartTheme', () => {
  it('resolves token names in the top-level color fields', () => {
    const theme = buildChartTheme(baseConfig);
    expect(theme.colors).toEqual([seriesColor.primary, seriesColor.secondary]);
    expect(theme.gridStyles.stroke).toBe(chartTokens.grid);
    expect(theme.backgroundColor).toBe('transparent');
  });

  it('resolves token names inside label and line style blocks', () => {
    const theme = buildChartTheme({
      ...baseConfig,
      svgLabelSmall: { fill: 'chart.axis' },
      yTickLineStyles: { stroke: 'chart.series.primary' },
    });
    expect(theme.svgLabelSmall.fill).toBe(chartTokens.axis);
    expect(theme.axisStyles.y.left.tickLine.stroke).toBe(seriesColor.primary);
  });

  // THE REGRESSION: visx merges each style block by spreading it over its own
  // defaults, so a `fill`/`stroke` key present with the value `undefined` blanks
  // the default instead of falling back to it. A wrapper that always wrote the
  // key therefore turned every partial block into a silent un-styling — and
  // silently, in the safe-looking direction, since the mark still renders.
  describe('a partial style block', () => {
    it('overrides only the keys it carries, keeping the default fill', () => {
      const bare = buildChartTheme(baseConfig);
      const partial = buildChartTheme({
        ...baseConfig,
        svgLabelBig: { fontSize: 14 },
      });
      expect(partial.svgLabelBig.fontSize).toBe(14);
      // Non-vacuous: visx's default fill is a real color, not `undefined`.
      expect(typeof bare.svgLabelBig.fill).toBe('string');
      expect(partial.svgLabelBig.fill).toBe(bare.svgLabelBig.fill);
    });

    it('keeps the default axis-line stroke', () => {
      const partial = buildChartTheme({
        ...baseConfig,
        xAxisLineStyles: { strokeWidth: 3 },
      });
      const axisLine = partial.axisStyles.x.bottom.axisLine;
      expect(axisLine.strokeWidth).toBe(3);
      // visx defaults the x-axis line to `gridColorDark`, resolved from a token.
      expect(axisLine.stroke).toBe(chartTokens.axis);
    });

    it('keeps the default tick-line stroke', () => {
      const partial = buildChartTheme({
        ...baseConfig,
        xTickLineStyles: { strokeWidth: 2 },
      });
      const tickLine = partial.axisStyles.x.bottom.tickLine;
      expect(tickLine.strokeWidth).toBe(2);
      // Tick lines default to `gridColor`, not `gridColorDark`.
      expect(tickLine.stroke).toBe(chartTokens.grid);
    });
  });

  it('forwards a color the caller explicitly set to undefined', () => {
    // Deliberate: the wrapper translates token names and changes nothing else,
    // so this config behaves as it would against visx's function directly.
    const theme = buildChartTheme({
      ...baseConfig,
      svgLabelBig: { fill: undefined },
      yAxisLineStyles: { stroke: undefined },
    });
    expect(theme.svgLabelBig.fill).toBeUndefined();
    expect(theme.axisStyles.y.left.axisLine.stroke).toBeUndefined();
  });
});
