import { cleanup, fireEvent, render } from '@testing-library/react';
import { Profiler, useEffect, useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { LineSeries, XYChart } from './index.js';
import {
  SyncedChartGroup,
  useHoveredTimestamp,
  useInteractionDispatch,
} from './interaction.js';
import { SyncedTooltip } from './synced-tooltip.js';
import { chartTheme } from './xychart-theme.js';

/**
 * The claim this file exists to hold up: **a pointer move over one panel
 * updates every panel's readout and re-renders nothing.**
 *
 * The cost being designed out is not "the tooltip shows the wrong number" — it
 * is that a `SyncedChartGroup` puts one visx event bus above every panel, so a
 * single pointer move fans out to N `Tooltip`s, each running its own
 * nearest-datum lookup, its own tooltip-context update and its own portal
 * re-render. An implementation that showed the right values while still
 * re-rendering per move would pass a visual check and miss the point, so the
 * assertions below are about commits and node identity as much as about text.
 *
 * As in `emphasis.test.tsx`, the cursor is driven from a button INSIDE the
 * mounted tree: re-rendering the harness from outside would revisit the whole
 * subtree regardless of subscriptions and mask what is being measured.
 */

afterEach(cleanup);

const DATA = Array.from({ length: 5 }, (_, index) => ({
  x: index,
  y: 10 * index,
}));

const STOPS = DATA.map((datum) => datum.x);
const A_BY_X = new Map(DATA.map((datum) => [datum.x, datum.y]));
const B_BY_X = new Map(DATA.map((datum) => [datum.x, 100 - datum.y]));

const SERIES = [
  {
    id: 'a',
    label: 'Alpha',
    color: 'chart.series.primary' as const,
    valueAt: (x: number) => A_BY_X.get(x) ?? null,
    format: (value: number) => `${value} u`,
  },
  {
    id: 'b',
    label: 'Beta',
    color: 'chart.series.secondary' as const,
    valueAt: (x: number) => B_BY_X.get(x) ?? null,
  },
];

/** Publishes a cursor position, the way a hovered panel does. */
function CursorButton({ at }: { at: number | null }) {
  const { setHoveredTimestamp } = useInteractionDispatch();
  return (
    <button
      data-testid={`cursor-${at ?? 'none'}`}
      onClick={() => setHoveredTimestamp(at)}
    >
      move
    </button>
  );
}

function HideButton({ id }: { id: string }) {
  const { toggleKey } = useInteractionDispatch();
  return (
    <button data-testid={`hide-${id}`} onClick={() => toggleKey(id)}>
      hide
    </button>
  );
}

/** Counts commits of the mark it stands in for. */
function Mark({ onRender, label }: { onRender: () => void; label?: string }) {
  useEffect(() => {
    onRender();
  });
  return <text>{label}</text>;
}

function setup({ marks = true }: { marks?: boolean } = {}) {
  let panelCommits = 0;
  let markRenders = 0;

  const view = render(
    <SyncedChartGroup>
      <CursorButton at={2} />
      <CursorButton at={3} />
      <CursorButton at={null} />
      <HideButton id="b" />
      <Profiler
        id="panel"
        onRender={() => {
          panelCommits += 1;
        }}
      >
        <XYChart
          theme={chartTheme}
          width={400}
          height={200}
          xScale={{ type: 'linear', domain: [0, 4] }}
          yScale={{ type: 'linear', domain: [0, 100] }}
        >
          <LineSeries
            dataKey="a"
            data={DATA}
            xAccessor={(datum: (typeof DATA)[number]) => datum.x}
            yAccessor={(datum: (typeof DATA)[number]) => datum.y}
          />
          <Mark
            onRender={() => {
              markRenders += 1;
            }}
          />
          <SyncedTooltip
            stops={STOPS}
            series={SERIES}
            marks={marks}
            formatX={(x) => `#${x}`}
          />
        </XYChart>
      </Profiler>
    </SyncedChartGroup>,
  );

  const query = <T extends Element>(selector: string) =>
    view.container.querySelector<T>(selector)!;

  return {
    ...view,
    query,
    card: () => query<HTMLElement>('[data-part="synced-tooltip-card"]'),
    row: (id: string) => query<HTMLElement>(`[data-readout-row="${id}"]`),
    dot: (id: string) => query<SVGCircleElement>(`[data-readout-dot="${id}"]`),
    header: () => query<HTMLElement>('[data-readout-header]'),
    value: (id: string) =>
      query<HTMLElement>(`[data-readout-row="${id}"] [data-readout-value]`)
        .textContent,
    commits: () => panelCommits,
    markRenders: () => markRenders,
  };
}

const click = (testId: string) =>
  fireEvent.click(document.querySelector(`[data-testid="${testId}"]`)!);

describe('SyncedTooltip (DOM writes, not re-renders)', () => {
  it('fills the readout from the shared cursor without re-rendering the panel', () => {
    const view = setup();

    expect(view.card().style.display).toBe('none');

    const nodesBefore = [view.card(), view.row('a'), view.dot('a')];
    const commitsBefore = view.commits();
    const marksBefore = view.markRenders();

    // The measurement is live in this exact position: mounting the panel
    // committed, so a flat count after the click is a fact about the cursor
    // path rather than about a `<Profiler>` that never fires here.
    expect(commitsBefore).toBeGreaterThan(0);
    expect(marksBefore).toBeGreaterThan(0);

    click('cursor-2');

    // The readout itself: this chart's own values at the shared stop.
    expect(view.card().style.display).toBe('block');
    expect(view.header().textContent).toBe('#2');
    expect(view.value('a')).toBe('20 u');
    expect(view.value('b')).toBe('80');

    // The mechanism: the SAME nodes were mutated in place. A re-render that
    // produced equal markup would satisfy the assertions above; it could not
    // satisfy this one.
    expect([view.card(), view.row('a'), view.dot('a')]).toEqual(nodesBefore);

    // The cost: no React work at all — not in the panel, not in the marks.
    expect(view.commits()).toBe(commitsBefore);
    expect(view.markRenders()).toBe(marksBefore);
  });

  it('stays render-free across a pointer sweep', () => {
    const view = setup();
    const commitsBefore = view.commits();
    const marksBefore = view.markRenders();

    for (let i = 0; i < 20; i++) {
      click('cursor-2');
      click('cursor-3');
    }

    expect(view.header().textContent).toBe('#3');
    expect(view.value('a')).toBe('30 u');
    expect(view.commits()).toBe(commitsBefore);
    expect(view.markRenders()).toBe(marksBefore);
  });

  it('moves the crosshair and the readout dots with the cursor', () => {
    const view = setup();

    click('cursor-2');
    const line = view.query<SVGLineElement>(
      '[data-part="synced-tooltip"] line',
    );
    const atTwo = line.getAttribute('x1');
    expect(line.style.display).toBe('');
    expect(atTwo).not.toBeNull();
    expect(view.dot('a').getAttribute('cx')).toBe(atTwo);
    expect(view.dot('a').style.display).toBe('');

    click('cursor-3');
    expect(line.getAttribute('x1')).not.toBe(atTwo);
    expect(view.dot('a').getAttribute('cx')).toBe(line.getAttribute('x1'));
  });

  it('hides the whole readout when the cursor leaves the group', () => {
    const view = setup();

    click('cursor-2');
    expect(view.card().style.display).toBe('block');

    click('cursor-none');
    expect(view.card().style.display).toBe('none');
    expect(view.dot('a').style.display).toBe('none');
    expect(
      view.query<SVGLineElement>('[data-part="synced-tooltip"] line').style
        .display,
    ).toBe('none');
  });

  it('drops the row for a series the group has hidden, still without a render', () => {
    const view = setup();
    click('cursor-2');
    const commitsBefore = view.commits();

    click('hide-b');

    expect(view.row('b').style.display).toBe('none');
    expect(view.dot('b').style.display).toBe('none');
    // A visible row keeps its `flex`: restoring `display` has to put back what
    // the style prop declared, not merely clear the `none`.
    expect(view.row('a').style.display).toBe('flex');
    expect(view.commits()).toBe(commitsBefore);

    click('hide-b');
    expect(view.row('b').style.display).toBe('flex');
  });

  it('omits the crosshair and dots when `marks` is false', () => {
    const view = setup({ marks: false });
    click('cursor-2');

    expect(view.container.querySelector('[data-readout-dot]')).toBeNull();
    expect(
      view.container.querySelector('[data-part="synced-tooltip"] line'),
    ).toBeNull();
    expect(view.card().style.display).toBe('block');
    expect(view.value('a')).toBe('20 u');
  });

  it('follows a data tick that moves the values under a stationary cursor', () => {
    /**
     * The readout is a function of scales and data this component does not
     * own, so a render it did not cause — a streaming tick, a resize — still
     * has to reach the mounted nodes. This is the un-keyed re-sweep effect,
     * and it is NOT the hover path: it runs on renders that were happening
     * anyway.
     */
    function Streaming() {
      const [scale, setScale] = useState(1);
      return (
        <>
          <button data-testid="tick" onClick={() => setScale(2)}>
            tick
          </button>
          <XYChart
            theme={chartTheme}
            width={400}
            height={200}
            xScale={{ type: 'linear', domain: [0, 4] }}
            yScale={{ type: 'linear', domain: [0, 100] }}
          >
            <SyncedTooltip
              stops={STOPS}
              formatX={(x) => `#${x}`}
              series={[
                {
                  id: 'a',
                  label: 'Alpha',
                  color: 'chart.series.primary',
                  valueAt: (x) => (A_BY_X.get(x) ?? 0) * scale,
                },
              ]}
            />
          </XYChart>
        </>
      );
    }

    const { container } = render(
      <SyncedChartGroup>
        <CursorButton at={2} />
        <Streaming />
      </SyncedChartGroup>,
    );

    const value = () =>
      container.querySelector('[data-readout-value]')!.textContent;

    click('cursor-2');
    expect(value()).toBe('20');

    click('tick');
    expect(value()).toBe('40');
  });

  /**
   * The control for every "did not re-render" assertion above. A counter that
   * cannot move proves nothing, so this is the same readout wired the way it is
   * written today: a component that READS the cursor through React.
   *
   * Both counters move here — the `<Profiler>` commit count AND the per-mark
   * count — so that neither moves above is a property of `SyncedTooltip`, not
   * of the measurement. The `<Profiler>` count is the load-bearing one: React
   * bails out of re-rendering a child whose element reference is unchanged, so
   * a panel that merely passes its children through can re-render while a
   * per-mark counter stays flat.
   */
  it('control: reading the cursor through React DOES re-render the panel', () => {
    let commits = 0;
    let markRenders = 0;

    function ReadoutByRerender() {
      const [cursor] = useHoveredTimestamp();
      return (
        <Mark
          label={cursor == null ? '' : `#${cursor}`}
          onRender={() => {
            markRenders += 1;
          }}
        />
      );
    }

    render(
      <SyncedChartGroup>
        <CursorButton at={2} />
        <svg>
          <Profiler
            id="control"
            onRender={() => {
              commits += 1;
            }}
          >
            <ReadoutByRerender />
          </Profiler>
        </svg>
      </SyncedChartGroup>,
    );

    const commitsBefore = commits;
    const marksBefore = markRenders;
    click('cursor-2');

    expect(commits).toBeGreaterThan(commitsBefore);
    expect(markRenders).toBeGreaterThan(marksBefore);
  });

  it('requires a provider rather than silently doing nothing', () => {
    expect(() =>
      render(
        <XYChart
          width={100}
          height={100}
          xScale={{ type: 'linear' }}
          yScale={{ type: 'linear' }}
        >
          <SyncedTooltip stops={STOPS} series={SERIES} />
        </XYChart>,
      ),
    ).toThrow(/DashboardInteractionProvider/);
  });
});
