import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { HistogramSeries, type HistogramSeriesProps } from './histogram.js';
import { XYChart } from './index.js';
import { chartTheme } from './theme.js';

afterEach(cleanup);

// `HistogramSeriesProps` is a discriminated union (`{ bins }` XOR `{ values,
// ...binning options }`) rather than two independently-optional fields, so
// supplying neither is a compile error instead of silently rendering
// nothing. These tests exercise both valid branches render identically, and
// that the invalid ("neither") shape is rejected by the type checker.

const BINS = [
  { x0: 0, x1: 5, count: 2 },
  { x0: 5, x1: 10, count: 4 },
];

const renderHistogram = (props: HistogramSeriesProps) =>
  render(
    <XYChart
      theme={chartTheme}
      width={200}
      height={100}
      xScale={{ type: 'linear', domain: [0, 10] }}
      yScale={{ type: 'linear', domain: [0, 4] }}
    >
      <HistogramSeries {...props} />
    </XYChart>,
  );

describe('HistogramSeries (discriminated union props)', () => {
  it('renders one rect per precomputed bin', () => {
    const { container } = renderHistogram({ bins: BINS });
    expect(
      container.querySelectorAll('[data-part="histogram-series"] rect'),
    ).toHaveLength(BINS.length);
  });

  it('renders the same bar count from equivalent raw `values` instead of `bins`', () => {
    const values = [1, 2, 3, 4, 6, 7, 8, 9];
    const { container } = renderHistogram({
      values,
      binCount: 2,
      domain: [0, 10],
    });
    expect(
      container.querySelectorAll('[data-part="histogram-series"] rect'),
    ).toHaveLength(2);
  });

  it('rejects neither `bins` nor `values` at compile time', () => {
    // @ts-expect-error - the union requires exactly one of `bins`/`values`.
    const invalid: HistogramSeriesProps = { color: 'red' };
    expect(invalid).toBeDefined();
  });
});
