import { cleanup, render } from '@testing-library/react';
import { scaleLinear } from '@visx/scale';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { AxisBottom, AxisLeft } from './axis.js';
import { chartTokens } from './theme.js';

afterEach(cleanup);

const scale = scaleLinear<number>({ domain: [0, 100], range: [0, 200] });

const renderInSvg = (node: ReactElement) =>
  render(
    <svg width={220} height={40}>
      {node}
    </svg>,
  );

describe('themed standalone axes', () => {
  it('strokes the axis + tick lines with the axis token by default', () => {
    const { container } = renderInSvg(
      <AxisBottom scale={scale} numTicks={4} />,
    );
    const lines = [...container.querySelectorAll('line')];
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line.getAttribute('stroke')).toBe(chartTokens.axis);
    }
  });

  it('fills tick labels with the muted label token by default', () => {
    const { container } = renderInSvg(<AxisLeft scale={scale} numTicks={3} />);
    const texts = [...container.querySelectorAll('text')];
    expect(texts.length).toBeGreaterThan(0);
    for (const text of texts) {
      expect(text.getAttribute('fill')).toBe(chartTokens.label);
    }
  });

  it('lets a caller override the themed default', () => {
    const { container } = renderInSvg(
      <AxisBottom scale={scale} stroke="#123456" />,
    );
    const axisLine = container.querySelector('.visx-axis-line');
    expect(axisLine?.getAttribute('stroke')).toBe('#123456');
  });
});
