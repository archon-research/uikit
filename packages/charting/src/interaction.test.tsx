import { cleanup, fireEvent, render } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  DashboardInteractionProvider,
  useDashboardInteraction,
  useInteractionValue,
} from './interaction.js';

/**
 * The hover-perf bug this file guards against: `DashboardInteractionContext`
 * is one value that changes identity on every `hoveredTimestamp` update, so
 * anything reading it via `useDashboardInteraction` (or the narrow selector
 * hooks built on it) re-renders on every hover tick, whether or not it cares
 * about `hoveredTimestamp`. `useInteractionValue` exists to opt a widget out
 * of that by binding to exactly one key.
 *
 * These tests drive `hoveredTimestamp`/`highlightedKey` from a button click
 * *inside* the already-mounted tree (via `fireEvent`), not by re-rendering
 * the test harness from outside. That distinction matters: re-rendering the
 * harness itself would recreate every child element and force React to
 * revisit the whole subtree regardless of context subscriptions, masking
 * the exact bug this fix targets. Triggering the state change from inside —
 * the same shape as a real pointer-move handler — is what actually exercises
 * `DashboardInteractionProvider`'s own re-render cascading (or not) into its
 * already-mounted children.
 */

afterEach(() => {
  cleanup();
});

function RenderCounter({ onRender }: { onRender: () => void }) {
  useEffect(() => {
    onRender();
  });
  return null;
}

/** Reads only `highlightedKey` via the new per-key store. */
function HighlightedKeyReader({ onRender }: { onRender: () => void }) {
  const highlightedKey = useInteractionValue('highlightedKey');
  return (
    <>
      <span data-testid="highlighted-key">{highlightedKey ?? 'none'}</span>
      <RenderCounter onRender={onRender} />
    </>
  );
}

/** Reads the full context, the pre-existing (still supported) pattern. */
function FullContextReader({ onRender }: { onRender: () => void }) {
  const { highlightedKey } = useDashboardInteraction();
  return (
    <>
      <span data-testid="full-context-highlighted-key">
        {highlightedKey ?? 'none'}
      </span>
      <RenderCounter onRender={onRender} />
    </>
  );
}

/** Emits a fresh `hoveredTimestamp` on every click, like a pointer-move handler would. */
function HoverBumpButton() {
  const { setHoveredTimestamp } = useDashboardInteraction();
  const [tick, setTick] = useState(0);
  return (
    <button
      data-testid="bump-hover"
      onClick={() => {
        const next = tick + 1;
        setTick(next);
        setHoveredTimestamp(next);
      }}
    >
      bump
    </button>
  );
}

/** Sets `highlightedKey` on click, like a legend hover handler would. */
function SetHighlightedKeyButton({ value }: { value: string | null }) {
  const { setHighlightedKey } = useDashboardInteraction();
  return (
    <button
      data-testid="set-highlighted-key"
      onClick={() => setHighlightedKey(value)}
    >
      highlight
    </button>
  );
}

describe('useInteractionValue', () => {
  it('does not re-render a highlightedKey-only subscriber when hoveredTimestamp changes', () => {
    let perKeyRenders = 0;
    let fullContextRenders = 0;

    const { getByTestId } = render(
      <DashboardInteractionProvider>
        <HoverBumpButton />
        <HighlightedKeyReader onRender={() => perKeyRenders++} />
        <FullContextReader onRender={() => fullContextRenders++} />
      </DashboardInteractionProvider>,
    );

    // Mount renders both once.
    expect(perKeyRenders).toBe(1);
    expect(fullContextRenders).toBe(1);

    fireEvent.click(getByTestId('bump-hover'));
    fireEvent.click(getByTestId('bump-hover'));
    fireEvent.click(getByTestId('bump-hover'));

    // The per-key subscriber only cares about `highlightedKey`, which never
    // changed, so it must not have re-rendered past its initial mount.
    expect(perKeyRenders).toBe(1);

    // Contrast: the full-context reader re-renders on every hoveredTimestamp
    // tick, exactly the pre-existing (and still supported) behavior.
    expect(fullContextRenders).toBe(4);
  });

  it('re-renders a highlightedKey subscriber when highlightedKey itself changes', () => {
    let perKeyRenders = 0;

    const { getByTestId } = render(
      <DashboardInteractionProvider>
        <SetHighlightedKeyButton value="series-a" />
        <HighlightedKeyReader onRender={() => perKeyRenders++} />
      </DashboardInteractionProvider>,
    );

    expect(perKeyRenders).toBe(1);
    expect(getByTestId('highlighted-key').textContent).toBe('none');

    fireEvent.click(getByTestId('set-highlighted-key'));

    expect(perKeyRenders).toBe(2);
    expect(getByTestId('highlighted-key').textContent).toBe('series-a');
  });

  it('throws when used outside a DashboardInteractionProvider', () => {
    function Bare() {
      useInteractionValue('highlightedKey');
      return null;
    }

    expect(() => render(<Bare />)).toThrow(
      /useInteractionValue must be used within a DashboardInteractionProvider/,
    );
  });
});
