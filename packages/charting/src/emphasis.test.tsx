import { cleanup, fireEvent, render } from '@testing-library/react';
import { Profiler, useEffect, useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { EmphasisLayer, EmphasisSeries } from './emphasis.js';
import {
  DashboardInteractionProvider,
  useDashboardInteraction,
  useInteractionValue,
} from './interaction.js';

/**
 * The claim this file exists to hold up, and the reason the component is built
 * the way it is: **a hover mutates already-mounted DOM and re-renders nothing.**
 *
 * The bug being designed out is not "the wrong series dims" — it is that
 * emphasis-by-re-render made a legend hover re-render every wired chart, which
 * downstream meant hundreds of nested SVG groups reconciled per hover and, with
 * streaming data pushing renders of its own, 1-2s before the dim appeared. An
 * implementation that dims the right series while still re-rendering the marks
 * would pass a visual check and fail the ticket, so the assertions below are
 * about renders and node identity, not only about attributes.
 *
 * As in `interaction.test.tsx`, state is driven from a button INSIDE the
 * mounted tree. Re-rendering the harness from outside would revisit the whole
 * subtree regardless of subscriptions and mask exactly what is being measured.
 */

afterEach(cleanup);

/** Counts commits of the subtree it wraps (a mark stands in for a real series). */
function Mark({
  onRender,
  strokeOpacity,
}: {
  onRender: () => void;
  /** Only the control uses this — the hand-threaded emphasis it stands in for. */
  strokeOpacity?: number;
}) {
  useEffect(() => {
    onRender();
  });
  return <path d="M0 0 L10 10" strokeOpacity={strokeOpacity} />;
}

function HighlightButton({ id }: { id: string | null }) {
  const { setHighlightedKey } = useDashboardInteraction();
  return (
    <button
      data-testid={`highlight-${id ?? 'none'}`}
      onClick={() => setHighlightedKey(id)}
    >
      highlight
    </button>
  );
}

function ToggleButton({ id }: { id: string }) {
  const { toggleKey } = useDashboardInteraction();
  return (
    <button data-testid={`toggle-${id}`} onClick={() => toggleKey(id)}>
      toggle
    </button>
  );
}

const SERIES = ['alpha', 'beta', 'gamma'];

function setup() {
  const renders: Record<string, number> = { alpha: 0, beta: 0, gamma: 0 };
  let layerCommits = 0;

  const view = render(
    <DashboardInteractionProvider>
      <HighlightButton id="beta" />
      <HighlightButton id={null} />
      <ToggleButton id="alpha" />
      <svg>
        <Profiler
          id="emphasis-layer"
          onRender={() => {
            layerCommits += 1;
          }}
        >
          <EmphasisLayer>
            {SERIES.map((id) => (
              <EmphasisSeries key={id} id={id}>
                <Mark
                  onRender={() => {
                    renders[id] = (renders[id] ?? 0) + 1;
                  }}
                />
              </EmphasisSeries>
            ))}
          </EmphasisLayer>
        </Profiler>
      </svg>
    </DashboardInteractionProvider>,
  );

  const group = (id: string) =>
    view.container.querySelector<SVGGElement>(`[data-series="${id}"]`)!;

  return { ...view, renders, group, commits: () => layerCommits };
}

describe('EmphasisLayer (CSS, not re-render)', () => {
  it('dims non-highlighted series without re-rendering any mark', () => {
    const { renders, group, commits } = setup();

    const nodesBefore = SERIES.map(group);
    const rendersBefore = { ...renders };
    const commitsBefore = commits();

    fireEvent.click(document.querySelector('[data-testid="highlight-beta"]')!);

    // The emphasis itself: applied, and applied to the right nodes.
    expect(group('beta').getAttribute('data-dim')).toBeNull();
    expect(group('beta').style.opacity).toBe('');
    expect(group('alpha').getAttribute('data-dim')).toBe('true');
    expect(group('alpha').style.opacity).toBe('0.18');
    expect(group('gamma').getAttribute('data-dim')).toBe('true');

    // The mechanism: the SAME DOM nodes were mutated in place. A re-render
    // that happened to produce equal markup would still satisfy the attribute
    // assertions above; it could not satisfy this one.
    expect(SERIES.map(group)).toEqual(nodesBefore);
    for (const node of nodesBefore) expect(node.isConnected).toBe(true);

    // The cost: zero React work. Not "fewer renders" — none, in the layer or
    // in any mark under it.
    expect(renders).toEqual(rendersBefore);
    expect(commits()).toBe(commitsBefore);
  });

  it('stays render-free across repeated hovers (the streaming-data case)', () => {
    const { renders, commits } = setup();
    const rendersBefore = { ...renders };
    const commitsBefore = commits();

    // A pointer tracking along a legend: highlight, clear, highlight, clear.
    for (let i = 0; i < 10; i++) {
      fireEvent.click(
        document.querySelector('[data-testid="highlight-beta"]')!,
      );
      fireEvent.click(
        document.querySelector('[data-testid="highlight-none"]')!,
      );
    }

    expect(renders).toEqual(rendersBefore);
    expect(commits()).toBe(commitsBefore);
  });

  it('clears the dim when the highlight clears', () => {
    const { group } = setup();

    fireEvent.click(document.querySelector('[data-testid="highlight-beta"]')!);
    expect(group('alpha').getAttribute('data-dim')).toBe('true');

    fireEvent.click(document.querySelector('[data-testid="highlight-none"]')!);
    expect(group('alpha').getAttribute('data-dim')).toBeNull();
    expect(group('alpha').style.opacity).toBe('');
  });

  it('hides a toggled-off series with `display: none`, still without re-rendering', () => {
    const { renders, group, commits } = setup();
    const rendersBefore = { ...renders };
    const commitsBefore = commits();

    fireEvent.click(document.querySelector('[data-testid="toggle-alpha"]')!);

    expect(group('alpha').getAttribute('data-hidden')).toBe('true');
    expect(group('alpha').style.display).toBe('none');
    expect(group('beta').getAttribute('data-hidden')).toBeNull();
    expect(renders).toEqual(rendersBefore);
    expect(commits()).toBe(commitsBefore);

    fireEvent.click(document.querySelector('[data-testid="toggle-alpha"]')!);
    expect(group('alpha').getAttribute('data-hidden')).toBeNull();
    expect(group('alpha').style.display).toBe('');
  });

  it('does not dim a hidden series (hidden wins, so it cannot come back mid-fade)', () => {
    const { group } = setup();

    fireEvent.click(document.querySelector('[data-testid="toggle-alpha"]')!);
    fireEvent.click(document.querySelector('[data-testid="highlight-beta"]')!);

    expect(group('alpha').getAttribute('data-hidden')).toBe('true');
    expect(group('alpha').getAttribute('data-dim')).toBeNull();
  });

  it('catches up a series that mounts while a highlight is already active', () => {
    function LateSeries() {
      const [mounted, setMounted] = useState(false);
      return (
        <>
          <button data-testid="mount-late" onClick={() => setMounted(true)}>
            mount
          </button>
          <svg>
            <EmphasisLayer>
              <EmphasisSeries id="alpha">
                <path d="M0 0" />
              </EmphasisSeries>
              {mounted ? (
                <EmphasisSeries id="delta">
                  <path d="M0 0" />
                </EmphasisSeries>
              ) : null}
            </EmphasisLayer>
          </svg>
        </>
      );
    }

    const { container } = render(
      <DashboardInteractionProvider>
        <HighlightButton id="beta" />
        <LateSeries />
      </DashboardInteractionProvider>,
    );

    fireEvent.click(document.querySelector('[data-testid="highlight-beta"]')!);
    fireEvent.click(document.querySelector('[data-testid="mount-late"]')!);

    expect(
      container
        .querySelector('[data-series="delta"]')!
        .getAttribute('data-dim'),
    ).toBe('true');
  });

  /**
   * The control for every "did not re-render" assertion above. A counter that
   * cannot move proves nothing, so this is the same tree with emphasis wired
   * the way consumers were writing it by hand: a component that READS
   * `highlightedKey` through React and composes each mark's opacity from it.
   *
   * Both counters move here — the `<Profiler>` commit count AND the per-mark
   * count. That they do not move above is therefore a property of
   * `EmphasisLayer`, not of the measurement.
   *
   * Worth knowing which of the two is the load-bearing one. React bails out of
   * re-rendering a child whose element reference is unchanged, so a layer that
   * merely PASSES `children` through can re-render without its marks
   * re-rendering: the per-mark counter alone would call that a pass. The
   * `<Profiler>` count is what actually pins "this layer did not re-render at
   * all", and it is the one that would catch an `EmphasisLayer` rewritten to
   * read the store through `useInteractionValue`. The per-mark counter pins the
   * other half — that emphasis never reaches the marks as changed props, which
   * is the shape (a composed `strokeOpacity` per series) that made a legend
   * hover cost a full chart reconcile downstream.
   */
  it('control: reading the same key through React DOES re-render the marks', () => {
    let markRenders = 0;
    let commits = 0;

    function EmphasisByRerender() {
      const highlightedKey = useInteractionValue('highlightedKey');
      return (
        <g>
          <Mark
            strokeOpacity={
              highlightedKey === null || highlightedKey === 'alpha' ? 1 : 0.18
            }
            onRender={() => {
              markRenders += 1;
            }}
          />
        </g>
      );
    }

    render(
      <DashboardInteractionProvider>
        <HighlightButton id="beta" />
        <svg>
          <Profiler
            id="control"
            onRender={() => {
              commits += 1;
            }}
          >
            <EmphasisByRerender />
          </Profiler>
        </svg>
      </DashboardInteractionProvider>,
    );

    const marksBefore = markRenders;
    const commitsBefore = commits;
    fireEvent.click(document.querySelector('[data-testid="highlight-beta"]')!);

    expect(commits).toBeGreaterThan(commitsBefore);
    expect(markRenders).toBeGreaterThan(marksBefore);
  });

  it('honours a custom `dimOpacity`', () => {
    const { container } = render(
      <DashboardInteractionProvider>
        <HighlightButton id="beta" />
        <svg>
          <EmphasisLayer dimOpacity={0.5}>
            <EmphasisSeries id="alpha">
              <path d="M0 0" />
            </EmphasisSeries>
          </EmphasisLayer>
        </svg>
      </DashboardInteractionProvider>,
    );

    fireEvent.click(document.querySelector('[data-testid="highlight-beta"]')!);
    expect(
      container.querySelector<SVGGElement>('[data-series="alpha"]')!.style
        .opacity,
    ).toBe('0.5');
  });

  it('requires a provider rather than silently doing nothing', () => {
    expect(() =>
      render(
        <svg>
          <EmphasisLayer>
            <EmphasisSeries id="alpha">
              <path d="M0 0" />
            </EmphasisSeries>
          </EmphasisLayer>
        </svg>,
      ),
    ).toThrow(/DashboardInteractionProvider/);
  });
});
