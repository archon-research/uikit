import { cleanup, fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ZoomPanOverlay, type ZoomDomain } from './zoom.js';

afterEach(cleanup);

const DOMAIN: ZoomDomain = [1000, 2000];
const WIDTH = 200;
const HEIGHT = 100;

describe('ZoomPanOverlay', () => {
  it('emits the untransformed domain once on mount', () => {
    const onDomainChange = vi.fn();
    render(
      <ZoomPanOverlay
        width={WIDTH}
        height={HEIGHT}
        domain={DOMAIN}
        onDomainChange={onDomainChange}
      />,
    );
    expect(onDomainChange).toHaveBeenCalledTimes(1);
    expect(onDomainChange).toHaveBeenCalledWith([1000, 2000]);
  });

  // The whole overlay hangs on this one: `scaleYMin`/`scaleYMax` pin the y
  // scale to 1, and visx discards a proposed transform whole if EITHER axis
  // violates its bounds — so a wheel handler that scales both axes zooms
  // nothing at all, silently, while every other behaviour keeps working.
  it('re-emits a narrower window after a wheel zoom', () => {
    const onDomainChange = vi.fn();
    const { container } = render(
      <ZoomPanOverlay
        width={WIDTH}
        height={HEIGHT}
        domain={DOMAIN}
        onDomainChange={onDomainChange}
      />,
    );
    const surface = container.querySelector('rect');
    expect(surface).not.toBeNull();
    fireEvent.wheel(surface!, {
      deltaY: -100,
      clientX: WIDTH / 2,
      clientY: HEIGHT / 2,
    });
    expect(onDomainChange).toHaveBeenCalledTimes(2);
    const [start, end] = onDomainChange.mock.lastCall![0] as ZoomDomain;
    expect(start).toBeGreaterThan(1000);
    expect(end).toBeLessThan(2000);
    expect(start).toBeLessThan(end);
  });

  it('does not re-emit when only the callback identity changes', () => {
    const onEmit = vi.fn();
    function Consumer() {
      const [, setWindow] = useState<ZoomDomain>(DOMAIN);
      return (
        <ZoomPanOverlay
          width={WIDTH}
          height={HEIGHT}
          domain={DOMAIN}
          onDomainChange={(next) => {
            onEmit(next);
            setWindow(next);
          }}
        />
      );
    }
    render(<Consumer />);
    expect(onEmit).toHaveBeenCalledTimes(1);
  });
});
