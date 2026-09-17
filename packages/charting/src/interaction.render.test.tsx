import { cleanup, render } from '@testing-library/react';
import { DataContext } from '@visx/xychart';
import { useContext, useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BarSeries, LineSeries, XYChart } from './index.js';
import {
  DashboardInteractionProvider,
  DragSelectionOverlay,
  useDashboardInteraction,
  type PixelRange,
} from './interaction.js';
import { chartTheme } from './xychart-theme.js';

/**
 * `interaction.test.tsx` covers `useTimeRangeBrushGesture` as a plain hook
 * (no DOM needed). `DragSelectionOverlay` reads a real `xScale` off
 * `@visx/xychart`'s `DataContext`, which only exists inside a mounted
 * `<XYChart>` — hence a `.render.test.tsx` sibling, matching the split
 * `emphasis`/`synced-tooltip` already use.
 *
 * Each test captures the chart's OWN live `xScale` (via `ScaleCapture`
 * below) rather than assuming a pixel/domain mapping, so the pixel input to
 * `DragSelectionOverlay` is always self-consistent with whatever margin and
 * scale-type-specific range `<XYChart>` actually computed.
 */

afterEach(cleanup);

/** Surfaces the mounted chart's own `xScale` to the test via a callback ref. */
function ScaleCapture({ onScale }: { onScale: (scale: unknown) => void }) {
  const dataContext = useContext(DataContext);
  useEffect(() => {
    if (dataContext?.xScale) onScale(dataContext.xScale);
  });
  return null;
}

/** Renders the committed `timeRange` as text, so a test can assert on it. */
function TimeRangeReader() {
  const { timeRange } = useDashboardInteraction();
  return (
    <span data-testid="time-range">
      {timeRange ? `${timeRange.start}:${timeRange.end}` : 'none'}
    </span>
  );
}

const LINE_DATA = [
  { x: 0, y: 1 },
  { x: 1000, y: 5 },
];

const BAND_DATA = [
  { x: 1, y: 1 },
  { x: 2, y: 2 },
  { x: 3, y: 3 },
  { x: 4, y: 4 },
  { x: 5, y: 5 },
];

const STRING_BAND_DATA = [
  { x: 'a', y: 1 },
  { x: 'b', y: 2 },
  { x: 'c', y: 3 },
];

describe('DragSelectionOverlay — commit path per scale type', () => {
  it('commits a range for a linear xScale', () => {
    let scale: ((value: number) => number | undefined) | undefined;
    const { getByTestId, rerender } = render(
      <DashboardInteractionProvider>
        <TimeRangeReader />
        <XYChart
          theme={chartTheme}
          width={300}
          height={150}
          xScale={{ type: 'linear', domain: [0, 1000] }}
          yScale={{ type: 'linear', domain: [0, 5] }}
        >
          <ScaleCapture
            onScale={(s) => {
              scale = s as unknown as (value: number) => number | undefined;
            }}
          />
          <LineSeries
            dataKey="line"
            data={LINE_DATA}
            xAccessor={(d: (typeof LINE_DATA)[number]) => d.x}
            yAccessor={(d: (typeof LINE_DATA)[number]) => d.y}
          />
          <DragSelectionOverlay livePx={null} committedPx={null} />
        </XYChart>
      </DashboardInteractionProvider>,
    );

    expect(scale).toBeDefined();
    const pxStart = scale!(200)!;
    const pxEnd = scale!(800)!;
    const committedPx: PixelRange = { start: pxStart, end: pxEnd };

    rerender(
      <DashboardInteractionProvider>
        <TimeRangeReader />
        <XYChart
          theme={chartTheme}
          width={300}
          height={150}
          xScale={{ type: 'linear', domain: [0, 1000] }}
          yScale={{ type: 'linear', domain: [0, 5] }}
        >
          <LineSeries
            dataKey="line"
            data={LINE_DATA}
            xAccessor={(d: (typeof LINE_DATA)[number]) => d.x}
            yAccessor={(d: (typeof LINE_DATA)[number]) => d.y}
          />
          <DragSelectionOverlay livePx={null} committedPx={committedPx} />
        </XYChart>
      </DashboardInteractionProvider>,
    );

    const [start, end] = getByTestId('time-range').textContent!.split(':');
    expect(Number(start)).toBeCloseTo(200, 0);
    expect(Number(end)).toBeCloseTo(800, 0);
  });

  it('commits a range for a time xScale, coercing the inverted Date to epoch ms', () => {
    const domainStart = new Date('2024-01-01T00:00:00.000Z');
    const domainEnd = new Date('2024-01-02T00:00:00.000Z');
    const pointA = new Date('2024-01-01T06:00:00.000Z');
    const pointB = new Date('2024-01-01T18:00:00.000Z');

    let scale: ((value: Date) => number | undefined) | undefined;

    const { getByTestId, rerender } = render(
      <DashboardInteractionProvider>
        <TimeRangeReader />
        <XYChart
          theme={chartTheme}
          width={300}
          height={150}
          xScale={{ type: 'time', domain: [domainStart, domainEnd] }}
          yScale={{ type: 'linear', domain: [0, 5] }}
        >
          <ScaleCapture
            onScale={(s) => {
              scale = s as unknown as (value: Date) => number | undefined;
            }}
          />
          <LineSeries
            dataKey="line"
            data={[
              { x: domainStart, y: 1 },
              { x: domainEnd, y: 5 },
            ]}
            xAccessor={(d: { x: Date }) => d.x}
            yAccessor={(d: { y: number }) => d.y}
          />
          <DragSelectionOverlay livePx={null} committedPx={null} />
        </XYChart>
      </DashboardInteractionProvider>,
    );

    expect(scale).toBeDefined();
    const pxStart = scale!(pointA)!;
    const pxEnd = scale!(pointB)!;
    const committedPx: PixelRange = { start: pxStart, end: pxEnd };

    rerender(
      <DashboardInteractionProvider>
        <TimeRangeReader />
        <XYChart
          theme={chartTheme}
          width={300}
          height={150}
          xScale={{ type: 'time', domain: [domainStart, domainEnd] }}
          yScale={{ type: 'linear', domain: [0, 5] }}
        >
          <LineSeries
            dataKey="line"
            data={[
              { x: domainStart, y: 1 },
              { x: domainEnd, y: 5 },
            ]}
            xAccessor={(d: { x: Date }) => d.x}
            yAccessor={(d: { y: number }) => d.y}
          />
          <DragSelectionOverlay livePx={null} committedPx={committedPx} />
        </XYChart>
      </DashboardInteractionProvider>,
    );

    const [start, end] = getByTestId('time-range').textContent!.split(':');
    // A `Date` was inverted and coerced to a plain epoch-ms number — if the
    // coercion were missing (`Number.isFinite(new Date(...))` is `false`),
    // this stays 'none' and the assertions below fail.
    expect(Number(start)).toBeCloseTo(pointA.getTime(), -2);
    expect(Number(end)).toBeCloseTo(pointB.getTime(), -2);
  });

  it('commits a range for a band xScale with a numeric domain via a nearest-pixel scan', () => {
    let scale:
      | (((value: number) => number | undefined) & {
          bandwidth?: () => number;
        })
      | undefined;

    const { getByTestId, rerender } = render(
      <DashboardInteractionProvider>
        <TimeRangeReader />
        <XYChart
          theme={chartTheme}
          width={300}
          height={150}
          xScale={{ type: 'band', paddingInner: 0.2, domain: [1, 2, 3, 4, 5] }}
          yScale={{ type: 'linear', domain: [0, 5] }}
        >
          <ScaleCapture
            onScale={(s) => {
              scale = s as unknown as ((
                value: number,
              ) => number | undefined) & {
                bandwidth?: () => number;
              };
            }}
          />
          <BarSeries
            dataKey="bars"
            data={BAND_DATA}
            xAccessor={(d: (typeof BAND_DATA)[number]) => d.x}
            yAccessor={(d: (typeof BAND_DATA)[number]) => d.y}
          />
          <DragSelectionOverlay livePx={null} committedPx={null} />
        </XYChart>
      </DashboardInteractionProvider>,
    );

    expect(scale).toBeDefined();
    expect(typeof scale!.bandwidth).toBe('function');
    const halfBand = scale!.bandwidth!() / 2;
    // Centres of bands 2 and 4 — a band scale has no invert(), so these
    // pixel values can only resolve back to 2 and 4 via the nearest-scan.
    const pxStart = scale!(2)! + halfBand;
    const pxEnd = scale!(4)! + halfBand;
    const committedPx: PixelRange = { start: pxStart, end: pxEnd };

    rerender(
      <DashboardInteractionProvider>
        <TimeRangeReader />
        <XYChart
          theme={chartTheme}
          width={300}
          height={150}
          xScale={{ type: 'band', paddingInner: 0.2, domain: [1, 2, 3, 4, 5] }}
          yScale={{ type: 'linear', domain: [0, 5] }}
        >
          <BarSeries
            dataKey="bars"
            data={BAND_DATA}
            xAccessor={(d: (typeof BAND_DATA)[number]) => d.x}
            yAccessor={(d: (typeof BAND_DATA)[number]) => d.y}
          />
          <DragSelectionOverlay livePx={null} committedPx={committedPx} />
        </XYChart>
      </DashboardInteractionProvider>,
    );

    expect(getByTestId('time-range').textContent).toBe('2:4');
  });
});

describe('DragSelectionOverlay — uncommittable cases', () => {
  it('does not commit and warns in dev for a band scale over a string domain', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mount with `committedPx={null}` first, and only supply a real
    // committed range on a subsequent render (as the other commit-path
    // tests do). `<XYChart>` publishes a placeholder linear `DataContext`
    // scale on its very first render, before `<BarSeries>` registers and it
    // recomputes the real band scale — committing against that stale first
    // pass would test a rendering artifact, not this fix.
    const { getByTestId, rerender } = render(
      <DashboardInteractionProvider>
        <TimeRangeReader />
        <XYChart
          theme={chartTheme}
          width={300}
          height={150}
          xScale={{ type: 'band', paddingInner: 0.2, domain: ['a', 'b', 'c'] }}
          yScale={{ type: 'linear', domain: [0, 5] }}
        >
          <BarSeries
            dataKey="bars"
            data={STRING_BAND_DATA}
            xAccessor={(d: (typeof STRING_BAND_DATA)[number]) => d.x}
            yAccessor={(d: (typeof STRING_BAND_DATA)[number]) => d.y}
          />
          <DragSelectionOverlay livePx={null} committedPx={null} />
        </XYChart>
      </DashboardInteractionProvider>,
    );

    rerender(
      <DashboardInteractionProvider>
        <TimeRangeReader />
        <XYChart
          theme={chartTheme}
          width={300}
          height={150}
          xScale={{ type: 'band', paddingInner: 0.2, domain: ['a', 'b', 'c'] }}
          yScale={{ type: 'linear', domain: [0, 5] }}
        >
          <BarSeries
            dataKey="bars"
            data={STRING_BAND_DATA}
            xAccessor={(d: (typeof STRING_BAND_DATA)[number]) => d.x}
            yAccessor={(d: (typeof STRING_BAND_DATA)[number]) => d.y}
          />
          <DragSelectionOverlay
            livePx={null}
            committedPx={{ start: 10, end: 60 }}
          />
        </XYChart>
      </DashboardInteractionProvider>,
    );

    expect(getByTestId('time-range').textContent).toBe('none');
    expect(warnSpy).toHaveBeenCalled();
    expect(
      warnSpy.mock.calls.some(
        ([message]) =>
          typeof message === 'string' &&
          message.includes('[charting]') &&
          message.toLowerCase().includes('non-numeric'),
      ),
    ).toBe(true);

    warnSpy.mockRestore();
  });

  it('does not commit and warns in dev for a band drag that stays within a single band', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    let scale:
      | (((value: number) => number | undefined) & {
          bandwidth?: () => number;
        })
      | undefined;

    const { getByTestId, rerender } = render(
      <DashboardInteractionProvider>
        <TimeRangeReader />
        <XYChart
          theme={chartTheme}
          width={300}
          height={150}
          xScale={{ type: 'band', paddingInner: 0.2, domain: [1, 2, 3, 4, 5] }}
          yScale={{ type: 'linear', domain: [0, 5] }}
        >
          <ScaleCapture
            onScale={(s) => {
              scale = s as unknown as ((
                value: number,
              ) => number | undefined) & {
                bandwidth?: () => number;
              };
            }}
          />
          <BarSeries
            dataKey="bars"
            data={BAND_DATA}
            xAccessor={(d: (typeof BAND_DATA)[number]) => d.x}
            yAccessor={(d: (typeof BAND_DATA)[number]) => d.y}
          />
          <DragSelectionOverlay livePx={null} committedPx={null} />
        </XYChart>
      </DashboardInteractionProvider>,
    );

    expect(scale).toBeDefined();
    const bandwidth = scale!.bandwidth!();
    // Both endpoints land inside band 3's own pixel span (its left edge to
    // just short of its right edge) — nearer to band 3 than to band 2 or
    // band 4 on either side, so the nearest-scan resolves both to 3. The
    // gesture's own >4px pixel threshold does not guard against this: the
    // drag below is a clean 20px in a chart where each band is far wider.
    const left = scale!(3)!;
    const pxStart = left + 2;
    const pxEnd = Math.min(left + bandwidth - 2, left + 22);
    const committedPx: PixelRange = { start: pxStart, end: pxEnd };

    rerender(
      <DashboardInteractionProvider>
        <TimeRangeReader />
        <XYChart
          theme={chartTheme}
          width={300}
          height={150}
          xScale={{ type: 'band', paddingInner: 0.2, domain: [1, 2, 3, 4, 5] }}
          yScale={{ type: 'linear', domain: [0, 5] }}
        >
          <BarSeries
            dataKey="bars"
            data={BAND_DATA}
            xAccessor={(d: (typeof BAND_DATA)[number]) => d.x}
            yAccessor={(d: (typeof BAND_DATA)[number]) => d.y}
          />
          <DragSelectionOverlay livePx={null} committedPx={committedPx} />
        </XYChart>
      </DashboardInteractionProvider>,
    );

    expect(getByTestId('time-range').textContent).toBe('none');
    expect(warnSpy).toHaveBeenCalled();
    expect(
      warnSpy.mock.calls.some(
        ([message]) =>
          typeof message === 'string' &&
          message.includes('[charting]') &&
          message.toLowerCase().includes('single band'),
      ),
    ).toBe(true);

    warnSpy.mockRestore();
  });
});

describe('DragSelectionOverlay — commit-once', () => {
  it('does not re-fire setTimeRange for the same committedPx object', () => {
    let setTimeRangeCalls = 0;

    const committedPx: PixelRange = { start: 10, end: 60 };

    function CountingTimeRangeReader() {
      const { timeRange } = useDashboardInteraction();
      useEffect(() => {
        if (timeRange) setTimeRangeCalls += 1;
      }, [timeRange]);
      return (
        <span data-testid="time-range">
          {timeRange ? `${timeRange.start}:${timeRange.end}` : 'none'}
        </span>
      );
    }

    const { getByTestId, rerender } = render(
      <DashboardInteractionProvider>
        <CountingTimeRangeReader />
        <XYChart
          theme={chartTheme}
          width={300}
          height={150}
          xScale={{ type: 'linear', domain: [0, 1000] }}
          yScale={{ type: 'linear', domain: [0, 5] }}
        >
          <LineSeries
            dataKey="line"
            data={LINE_DATA}
            xAccessor={(d: (typeof LINE_DATA)[number]) => d.x}
            yAccessor={(d: (typeof LINE_DATA)[number]) => d.y}
          />
          <DragSelectionOverlay livePx={null} committedPx={committedPx} />
        </XYChart>
      </DashboardInteractionProvider>,
    );

    expect(getByTestId('time-range').textContent).not.toBe('none');
    expect(setTimeRangeCalls).toBe(1);

    // Re-render with the SAME committedPx object identity — must not re-commit.
    rerender(
      <DashboardInteractionProvider>
        <CountingTimeRangeReader />
        <XYChart
          theme={chartTheme}
          width={300}
          height={150}
          xScale={{ type: 'linear', domain: [0, 1000] }}
          yScale={{ type: 'linear', domain: [0, 5] }}
        >
          <LineSeries
            dataKey="line"
            data={LINE_DATA}
            xAccessor={(d: (typeof LINE_DATA)[number]) => d.x}
            yAccessor={(d: (typeof LINE_DATA)[number]) => d.y}
          />
          <DragSelectionOverlay livePx={null} committedPx={committedPx} />
        </XYChart>
      </DashboardInteractionProvider>,
    );

    expect(setTimeRangeCalls).toBe(1);
  });
});
