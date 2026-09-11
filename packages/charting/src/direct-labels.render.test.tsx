import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { DirectLabels, type DirectLabelItem } from './direct-labels.js';
import { EmphasisLayer } from './emphasis.js';
import { LineSeries, XYChart } from './index.js';
import { SyncedChartGroup, useToggleHiddenKey } from './interaction.js';
import { chartTheme } from './xychart-theme.js';

/**
 * `resolveLabelPositions` is unit-tested in `direct-labels.test.ts`. These
 * cover what `hiddenKeys` awareness changed: a hidden series must not leave its
 * end-of-line label behind, pointing at a line that is no longer drawn.
 */

afterEach(cleanup);

const LABELS: DirectLabelItem[] = [
  { id: 'tvl', label: 'TVL', value: 18, color: 'chart.series.primary' },
  { id: 'debt', label: 'Debt', value: 6, color: 'chart.series.secondary' },
];

function HideButton({ id }: { id: string }) {
  const toggle = useToggleHiddenKey();
  return (
    <button data-testid={`hide-${id}`} onClick={() => toggle(id)}>
      hide
    </button>
  );
}

function Chart({ children }: { children?: React.ReactNode }) {
  return (
    <XYChart
      theme={chartTheme}
      width={200}
      height={200}
      // Explicit, small margins: visx's 50px default would leave this chart no
      // inner height at all, collapsing every label onto the same y.
      margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
      xScale={{ type: 'linear', domain: [1, 2] }}
      yScale={{ type: 'linear', domain: [0, 20] }}
    >
      <LineSeries
        dataKey="tvl_usd"
        data={[
          { x: 1, y: 10 },
          { x: 2, y: 18 },
        ]}
        xAccessor={(datum: { x: number }) => datum.x}
        yAccessor={(datum: { y: number }) => datum.y}
      />
      {children}
    </XYChart>
  );
}

const renderedLabels = () =>
  [...document.querySelectorAll('[data-part="direct-labels"] text')].map(
    (node) => node.textContent,
  );

describe('DirectLabels and hiddenKeys', () => {
  it('drops the label of a series hidden in the group', () => {
    render(
      <SyncedChartGroup>
        <HideButton id="debt" />
        <Chart>
          <DirectLabels labels={LABELS} />
        </Chart>
      </SyncedChartGroup>,
    );

    expect(renderedLabels()).toEqual(['TVL', 'Debt']);

    fireEvent.click(screen.getByTestId('hide-debt'));
    expect(renderedLabels()).toEqual(['TVL']);

    fireEvent.click(screen.getByTestId('hide-debt'));
    expect(renderedLabels()).toEqual(['TVL', 'Debt']);
  });

  it('re-stacks the remaining labels into the freed space', () => {
    // Two labels close enough to collide: the resolver pushes the lower one
    // (`A`, at the smaller value) down and away from its ideal y to clear `B`.
    // Hiding `B` must hand `A` its ideal position back — which is why hidden
    // series are filtered out BEFORE placement rather than placed and then
    // hidden with CSS. On a [0, 20] domain over an 180px inner height, `A`'s
    // ideal y is 100; `B` at 10.2 sits at 98.2, so the 14px gap pushes `A` to
    // 112.2 while both are shown.
    const crowded: DirectLabelItem[] = [
      { id: 'a', label: 'A', value: 10, color: 'chart.series.primary' },
      { id: 'b', label: 'B', value: 10.2, color: 'chart.series.secondary' },
    ];

    render(
      <SyncedChartGroup>
        <HideButton id="b" />
        <Chart>
          <DirectLabels labels={crowded} />
        </Chart>
      </SyncedChartGroup>,
    );

    const labelA = () => Number(screen.getByText('A').getAttribute('y'));
    expect(labelA()).toBeCloseTo(112.2);

    fireEvent.click(screen.getByTestId('hide-b'));
    expect(labelA()).toBeCloseTo(100);
  });

  it('carries a `data-series` hook so an EmphasisLayer dims labels too', () => {
    render(
      <SyncedChartGroup>
        <Chart>
          <EmphasisLayer>
            <DirectLabels labels={LABELS} />
          </EmphasisLayer>
        </Chart>
      </SyncedChartGroup>,
    );

    expect(screen.getByText('Debt').getAttribute('data-series')).toBe('debt');
  });

  it('renders unchanged outside a provider', () => {
    // Backward compatibility: every other hook in the interaction layer throws
    // outside a provider on purpose, but `DirectLabels` already shipped and
    // already renders standalone. It must not start requiring one.
    expect(() =>
      render(
        <Chart>
          <DirectLabels labels={LABELS} />
        </Chart>,
      ),
    ).not.toThrow();
    expect(renderedLabels()).toEqual(['TVL', 'Debt']);
  });
});
