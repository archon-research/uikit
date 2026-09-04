/**
 * @vitest-environment jsdom
 *
 * Has to render: the bug this guards against is about COMMIT ORDERING
 * (does a value published this commit reflect a `keyMap` change made in
 * that same commit?), which a pure-logic test over `aliasesFor` alone
 * can't observe — React's actual effect-flush order is the thing under
 * test, matching how `ThemeProvider.test.ts` justifies its own jsdom use.
 */
import {
  DashboardInteractionProvider,
  useDashboardInteraction,
  type DashboardInteractionApi,
} from '@archon-research/charting';
import { act, cleanup, render } from '@testing-library/react';
import { createElement, useEffect, type MutableRefObject } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  useChartingInteraction,
  type InteractionKeyMap,
} from './charting-interaction.js';
import type { InteractionContextValue } from './interaction.js';

afterEach(cleanup);

const KEY_MAP_HIGHLIGHT: InteractionKeyMap = { myAlias: 'highlightedKey' };
const KEY_MAP_TIME_RANGE: InteractionKeyMap = { myAlias: 'timeRange' };

type Captured = {
  chartApi: DashboardInteractionApi;
  interaction: InteractionContextValue;
};

// Exposed to the test via a ref written inside an effect, not a module-scope
// binding reassigned during render: the latter is exactly the pattern this
// PR eliminates from the library code, so the test holds itself to it too.
function Inner({
  keyMap,
  capturedRef,
}: {
  keyMap: InteractionKeyMap;
  capturedRef: MutableRefObject<Captured | null>;
}) {
  const chartApi = useDashboardInteraction();
  const { interaction, InteractionSync } = useChartingInteraction(keyMap);

  useEffect(() => {
    capturedRef.current = { chartApi, interaction };
  });

  return createElement(InteractionSync);
}

function App({
  keyMap,
  capturedRef,
}: {
  keyMap: InteractionKeyMap;
  capturedRef: MutableRefObject<Captured | null>;
}) {
  return createElement(
    DashboardInteractionProvider,
    null,
    createElement(Inner, { keyMap, capturedRef }),
  );
}

describe('ChartingInteractionSync', () => {
  it('publishes under a keyMap change immediately, in the same commit as a chart value change', () => {
    const capturedRef: MutableRefObject<Captured | null> = { current: null };
    const { rerender } = render(
      createElement(App, { keyMap: KEY_MAP_HIGHLIGHT, capturedRef }),
    );

    act(() => {
      capturedRef.current!.chartApi.setHighlightedKey('initial');
    });
    expect(capturedRef.current!.interaction.read('myAlias')).toBe('initial');

    // Both happen in the SAME commit: `myAlias` is remapped from
    // `highlightedKey` to `timeRange`, and `timeRange` itself changes. A
    // stale (previous-commit) keyMap read would still resolve `myAlias` to
    // `highlightedKey` here and miss the new value entirely.
    act(() => {
      capturedRef.current!.chartApi.setTimeRange({ start: 1, end: 2 });
      rerender(createElement(App, { keyMap: KEY_MAP_TIME_RANGE, capturedRef }));
    });

    expect(capturedRef.current!.interaction.read('myAlias')).toEqual({
      start: 1,
      end: 2,
    });
  });
});
