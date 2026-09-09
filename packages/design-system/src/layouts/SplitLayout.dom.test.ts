/**
 * @vitest-environment jsdom
 *
 * `SplitLayout.test.ts` covers the two decisions as pure functions; this suite
 * covers the wiring between them and Ark Splitter, which is where both of them
 * were previously lost. Ark turns the initial split into a `flex-grow` per
 * panel, so the derived percentages are readable straight off the DOM without
 * any layout engine.
 */
import { cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { SplitLayout, type SplitLayoutProps } from './SplitLayout.js';

// jsdom ships no `ResizeObserver`, and Ark's splitter machine constructs one
// as soon as it mounts. Nothing here depends on it firing — the initial split
// is applied during the first render.
class NoopResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver ??= NoopResizeObserver as never;

afterEach(cleanup);

const PANELS = [
  { id: 'a', content: 'A', size: 1 },
  { id: 'b', content: 'B', size: 3 },
];

/** The `flex-grow` Ark assigned to each panel, in `panels` order. */
function renderGrowths(props: Partial<SplitLayoutProps> = {}): string[] {
  const { container } = render(
    createElement(SplitLayout, {
      orientation: 'horizontal',
      panels: PANELS,
      ...props,
    }),
  );
  return [
    ...container.querySelectorAll<HTMLElement>('.splitLayout__panel'),
  ].map((panel) => panel.style.flexGrow);
}

describe('SplitLayout initial sizing', () => {
  it('seeds Ark with the sizes derived from the panel weights', () => {
    expect(renderGrowths()).toEqual(['25', '75']);
  });

  it('lets a real controlled size win over the derived weights', () => {
    expect(renderGrowths({ size: [30, 70] })).toEqual(['30', '70']);
  });

  // An empty array is truthy, so it used to read as "controlled" — suppressing
  // the derived sizes — while giving Ark no size to apply either, leaving the
  // layout with neither and every panel at an equal share.
  it('still applies the derived weights when `size` is an empty array', () => {
    expect(renderGrowths({ size: [] })).toEqual(['25', '75']);
  });

  it('renders a numeric split even when a panel weight is NaN', () => {
    const growths = renderGrowths({
      panels: [
        { id: 'a', content: 'A', size: Number.NaN },
        { id: 'b', content: 'B', size: 1 },
      ],
    });
    expect(growths).toEqual(['50', '50']);
  });
});
