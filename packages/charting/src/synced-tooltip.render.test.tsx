import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { EventEmitterContext } from '@visx/xychart';
import { useContext, type ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { LineSeries, Tooltip, XYChart } from './index.js';
import { SyncedChartGroup, useSyncedCursor } from './interaction.js';
import { SyncedTooltip, type SyncedTooltipSeries } from './synced-tooltip.js';
import { chartTheme } from './xychart-theme.js';

/**
 * `synced-tooltip.test.tsx` proves the mechanism — DOM writes, no renders.
 * These prove it survives contact with what it actually has to work with: more
 * than one real `<XYChart>` in one group, panels that do not share a sampling
 * rate, and the visx event bus still sitting above all of them.
 */

afterEach(cleanup);

const DATA = Array.from({ length: 5 }, (_, index) => ({
  x: index,
  y: 10 * index,
}));

const accessors = {
  xAccessor: (datum: { x: number }) => datum.x,
  yAccessor: (datum: { y: number }) => datum.y,
};

/** Publishes the shared cursor from a widget that is not a chart at all. */
function CursorButton({ at }: { at: number }) {
  const { set } = useSyncedCursor();
  return (
    <button data-testid={`cursor-${at}`} onClick={() => set(at)}>
      move
    </button>
  );
}

function Panel({
  id,
  stops,
  series,
  children,
}: {
  id: string;
  stops: number[];
  series: SyncedTooltipSeries[];
  children?: ReactNode;
}) {
  return (
    <div data-testid={`panel-${id}`}>
      <XYChart
        theme={chartTheme}
        width={400}
        height={200}
        xScale={{ type: 'linear', domain: [0, 4] }}
        yScale={{ type: 'linear', domain: [0, 100] }}
      >
        <LineSeries dataKey={id} data={DATA} {...accessors} />
        <SyncedTooltip stops={stops} series={series} formatX={(x) => `#${x}`} />
        {children}
      </XYChart>
    </div>
  );
}

const readout = (panel: string) => {
  const root = screen.getByTestId(`panel-${panel}`);
  return {
    header: root.querySelector('[data-readout-header]')!.textContent,
    values: [...root.querySelectorAll('[data-readout-value]')].map(
      (node) => node.textContent,
    ),
    card: root.querySelector<HTMLElement>('[data-part="synced-tooltip-card"]')!,
  };
};

describe('SyncedTooltip across a real synced group', () => {
  it('raises each panel’s own values from one shared cursor', () => {
    render(
      <SyncedChartGroup>
        <CursorButton at={3} />
        <Panel
          id="usd"
          stops={[0, 1, 2, 3, 4]}
          series={[
            {
              id: 'tvl',
              label: 'TVL',
              color: 'chart.series.primary',
              valueAt: (x) => x * 10,
              format: (value) => `$${value}`,
            },
          ]}
        />
        <Panel
          id="pct"
          stops={[0, 1, 2, 3, 4]}
          series={[
            {
              id: 'tvl',
              label: 'TVL',
              color: 'chart.series.primary',
              valueAt: (x) => x * 2,
              format: (value) => `${value}%`,
            },
          ]}
        />
      </SyncedChartGroup>,
    );

    fireEvent.click(screen.getByTestId('cursor-3'));

    expect(readout('usd').header).toBe('#3');
    expect(readout('usd').values).toEqual(['$30']);
    expect(readout('pct').header).toBe('#3');
    expect(readout('pct').values).toEqual(['6%']);
  });

  it('snaps to each panel’s own stops, not to the publisher’s', () => {
    render(
      <SyncedChartGroup>
        <CursorButton at={3} />
        <Panel
          id="dense"
          stops={[0, 1, 2, 3, 4]}
          series={[
            {
              id: 'a',
              label: 'A',
              color: 'chart.series.primary',
              valueAt: (x) => x,
            },
          ]}
        />
        {/* Half the sampling rate: it has no datum at 3 and must not pretend to. */}
        <Panel
          id="sparse"
          stops={[0, 2, 4]}
          series={[
            {
              id: 'a',
              label: 'A',
              color: 'chart.series.primary',
              valueAt: (x) => x,
            },
          ]}
        />
      </SyncedChartGroup>,
    );

    fireEvent.click(screen.getByTestId('cursor-3'));

    expect(readout('dense').header).toBe('#3');
    expect(readout('sparse').header).toBe('#2');
    expect(readout('sparse').values).toEqual(['2']);
  });

  /**
   * The non-breaking guardrail, asserted rather than asserted-in-prose: this
   * readout is an ADDITIVE path alongside the shared visx event bus, not a
   * replacement for it. A consumer whose panels still put a visx `<Tooltip>` on
   * that bus keeps working; adopting `SyncedTooltip` is a swap inside one chart
   * body, made one panel at a time.
   */
  it('leaves the shared visx event bus in place for panels still using it', () => {
    // Reported as markup rather than into a captured variable: the emitter is
    // an absence when the provider is gone, and `null` is exactly what
    // `EventEmitterContext` defaults to outside one.
    function ReadEmitter() {
      const emitter = useContext(EventEmitterContext);
      return <span data-testid="bus">{emitter ? 'shared' : 'missing'}</span>;
    }

    render(
      <SyncedChartGroup>
        <ReadEmitter />
        <CursorButton at={2} />
        <Panel
          id="mixed"
          stops={[0, 1, 2, 3, 4]}
          series={[
            {
              id: 'a',
              label: 'A',
              color: 'chart.series.primary',
              valueAt: (x) => x,
            },
          ]}
        >
          <Tooltip
            snapTooltipToDatumX
            renderTooltip={({ tooltipData }) => (
              <span>{tooltipData?.nearestDatum?.key}</span>
            )}
          />
        </Panel>
      </SyncedChartGroup>,
    );

    expect(screen.getByTestId('bus').textContent).toBe('shared');

    // And both coexist in one chart body.
    fireEvent.click(screen.getByTestId('cursor-2'));
    expect(readout('mixed').header).toBe('#2');
  });
});
