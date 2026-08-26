import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { resolveChartColor } from './chart-color.js';
import { Swatch } from './legend.js';

afterEach(cleanup);

describe('Swatch', () => {
  it('renders a filled rect for the default "swatch" shape', () => {
    const { container } = render(
      <Swatch shape="swatch" color="chart.series.primary" />,
    );
    const rect = container.querySelector('rect');
    expect(rect).not.toBeNull();
    expect(rect?.getAttribute('fill')).toBe(
      resolveChartColor('chart.series.primary'),
    );
    expect(container.querySelector('line')).toBeNull();
  });

  it('renders a stroked line for the "line" shape', () => {
    const { container } = render(
      <Swatch shape="line" color="chart.series.secondary" />,
    );
    const line = container.querySelector('line');
    expect(line).not.toBeNull();
    expect(line?.getAttribute('stroke')).toBe(
      resolveChartColor('chart.series.secondary'),
    );
    expect(container.querySelector('rect')).toBeNull();
  });

  it('dashes the line swatch when dash is true', () => {
    const { container } = render(
      <Swatch shape="line" color="chart.series.primary" dash />,
    );
    expect(
      container.querySelector('line')?.getAttribute('stroke-dasharray'),
    ).toBe('3 2');
  });
});
