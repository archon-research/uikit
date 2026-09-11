import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { EmphasisLayer, EmphasisSeries } from './emphasis.js';
import { LineSeries, XYChart } from './index.js';
import { SyncedChartGroup } from './interaction.js';
import { SyncedChartLegend } from './synced-legend.js';
import { chartTheme } from './xychart-theme.js';

/**
 * The unit tests in `emphasis.test.tsx` prove the mechanism against plain SVG
 * nodes. These prove it survives contact with the two things it actually has to
 * work with: a real `<XYChart>` (whose series register themselves through
 * `DataContext`, so an inert `<g>` between chart and series must not break
 * that), and a real legend driving it across more than one chart.
 */

afterEach(cleanup);

const DATA = [
  { x: 1, y: 10 },
  { x: 2, y: 20 },
];

const accessors = {
  xAccessor: (datum: { x: number }) => datum.x,
  yAccessor: (datum: { y: number }) => datum.y,
};

/** Two charts in one group, naming the SAME logical series differently. */
function Dashboard() {
  return (
    <SyncedChartGroup>
      <SyncedChartLegend
        shape="line"
        items={[
          { id: 'tvl', label: 'TVL', color: 'chart.series.primary' },
          { id: 'debt', label: 'Debt', color: 'chart.series.secondary' },
          {
            id: 'limit',
            label: 'Limit',
            color: 'chart.critical',
            sync: false,
          },
        ]}
      />
      {[
        { chart: 'usd', tvlKey: 'tvl_usd', debtKey: 'debt_usd' },
        { chart: 'pct', tvlKey: 'tvl', debtKey: 'debt' },
      ].map(({ chart, tvlKey, debtKey }) => (
        <div key={chart} data-testid={`chart-${chart}`}>
          <XYChart
            theme={chartTheme}
            width={200}
            height={100}
            xScale={{ type: 'linear', domain: [1, 2] }}
            yScale={{ type: 'linear', domain: [0, 20] }}
          >
            <EmphasisLayer>
              <EmphasisSeries id="tvl">
                <LineSeries dataKey={tvlKey} data={DATA} {...accessors} />
              </EmphasisSeries>
              <EmphasisSeries id="debt">
                <LineSeries dataKey={debtKey} data={DATA} {...accessors} />
              </EmphasisSeries>
            </EmphasisLayer>
          </XYChart>
        </div>
      ))}
    </SyncedChartGroup>
  );
}

const seriesNode = (chart: string, id: string) =>
  screen
    .getByTestId(`chart-${chart}`)
    .querySelector<SVGGElement>(`[data-series="${id}"]`)!;

describe('EmphasisSeries inside a real XYChart', () => {
  it('does not disturb the series it wraps', () => {
    const { container } = render(
      <SyncedChartGroup>
        <XYChart
          theme={chartTheme}
          width={200}
          height={100}
          xScale={{ type: 'linear', domain: [1, 2] }}
          yScale={{ type: 'linear', domain: [0, 20] }}
        >
          <EmphasisLayer>
            <EmphasisSeries id="tvl">
              <LineSeries dataKey="tvl_usd" data={DATA} {...accessors} />
            </EmphasisSeries>
          </EmphasisLayer>
        </XYChart>
      </SyncedChartGroup>,
    );

    // The series still registers with `DataContext` and draws through the
    // chart's own scales: a registration the wrapper had broken renders no
    // path at all, and a scale it had not reached renders a path with no `d`.
    const path = container.querySelector<SVGPathElement>(
      '[data-series="tvl"] path',
    );
    expect(path).not.toBeNull();
    expect(path!.getAttribute('d')).toBe('M100,50L150,50');
    // Themed by `chartTheme`, exactly as the same series renders unwrapped.
    expect(path!.getAttribute('stroke')).toContain('--colors-chart-series');
  });
});

describe('SyncedChartLegend driving charts through the group', () => {
  it('dims the same logical series in every chart, across differing dataKeys', () => {
    render(<Dashboard />);

    fireEvent.mouseEnter(screen.getByText('TVL'));

    for (const chart of ['usd', 'pct']) {
      expect(seriesNode(chart, 'tvl').getAttribute('data-dim')).toBeNull();
      expect(seriesNode(chart, 'debt').getAttribute('data-dim')).toBe('true');
    }

    fireEvent.mouseLeave(screen.getByText('TVL'));
    for (const chart of ['usd', 'pct']) {
      expect(seriesNode(chart, 'debt').getAttribute('data-dim')).toBeNull();
    }
  });

  it('hides a clicked series everywhere and reflects it back on the item', () => {
    render(<Dashboard />);

    fireEvent.click(screen.getByText('Debt'));

    for (const chart of ['usd', 'pct']) {
      expect(seriesNode(chart, 'debt').getAttribute('data-hidden')).toBe(
        'true',
      );
      expect(seriesNode(chart, 'debt').style.display).toBe('none');
      expect(seriesNode(chart, 'tvl').getAttribute('data-hidden')).toBeNull();
    }

    // The legend item reads as toggled off, for sighted and assistive users.
    const item = screen.getByText('Debt').closest('button')!;
    expect(item.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('Debt').style.textDecoration).toBe('line-through');

    fireEvent.click(screen.getByText('Debt'));
    for (const chart of ['usd', 'pct']) {
      expect(seriesNode(chart, 'debt').getAttribute('data-hidden')).toBeNull();
    }
  });

  it('leaves every series alone when an opted-out item is hovered', () => {
    render(<Dashboard />);

    fireEvent.mouseEnter(screen.getByText('Limit'));

    // The failure this prevents: an entry with no series behind it highlights
    // an id no mark carries, so every real series dims and the chart greys out.
    for (const chart of ['usd', 'pct']) {
      expect(seriesNode(chart, 'tvl').getAttribute('data-dim')).toBeNull();
      expect(seriesNode(chart, 'debt').getAttribute('data-dim')).toBeNull();
    }

    fireEvent.click(screen.getByText('Limit'));
    for (const chart of ['usd', 'pct']) {
      expect(seriesNode(chart, 'tvl').getAttribute('data-hidden')).toBeNull();
      expect(seriesNode(chart, 'debt').getAttribute('data-hidden')).toBeNull();
    }
  });

  it('marks the highlighted item, and only it, as emphasized', () => {
    render(<Dashboard />);

    fireEvent.mouseEnter(screen.getByText('TVL'));
    expect(screen.getByText('TVL').style.fontWeight).toBe('700');
    expect(screen.getByText('Debt').style.fontWeight).toBe('');
  });
});
