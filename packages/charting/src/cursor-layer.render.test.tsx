import { cleanup, render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { Crosshair } from './cursor-layer.js';
import { chartTokens } from './theme.js';

afterEach(cleanup);

const renderInSvg = (node: ReactElement) =>
  render(
    <svg width={200} height={100}>
      {node}
    </svg>,
  );

describe('Crosshair', () => {
  it('draws a vertical line spanning [top, top + height] at x, themed by default', () => {
    const { container } = renderInSvg(<Crosshair x={42} top={5} height={80} />);
    const line = container.querySelector('line');
    expect(line).not.toBeNull();
    expect(line?.getAttribute('x1')).toBe('42');
    expect(line?.getAttribute('x2')).toBe('42');
    expect(line?.getAttribute('y1')).toBe('5');
    expect(line?.getAttribute('y2')).toBe('85');
    expect(line?.getAttribute('stroke')).toBe(chartTokens.axis);
    expect(line?.getAttribute('pointer-events')).toBe('none');
  });

  it('lets a caller override the themed default', () => {
    const { container } = renderInSvg(
      <Crosshair x={10} top={0} height={50} stroke="#123456" />,
    );
    expect(container.querySelector('line')?.getAttribute('stroke')).toBe(
      '#123456',
    );
  });
});
