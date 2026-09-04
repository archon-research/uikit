/**
 * @vitest-environment jsdom
 *
 * Pins the live-source reset against the one window that can defeat it.
 *
 * Switching sources resets two states and three refs, and the reset is spread
 * across three phases (render, layout, passive — see `usePlayback.ts`). What
 * holds it together is that nothing from the OUTGOING source can be observed
 * in between. The threat is real rather than theoretical: the outgoing
 * subscription is not torn down until the passive phase, and passive effects
 * are flushed on a scheduler task that a `requestAnimationFrame` can beat, so
 * the outgoing batcher can still flush after the switch has committed.
 *
 * This suite stands inside that window deliberately. The wrapper's
 * `useLayoutEffect` runs after the hook component's (parent effects run after
 * children, both in the layout phase, both before any passive effect), which is
 * exactly the gap; from there it emits on the outgoing source and forces that
 * source's batcher to flush.
 *
 * Both halves of the protection are load-bearing, and removing either one makes
 * this suite fail with the outgoing source's events showing up under the new
 * one:
 *
 * - Drop the `isCurrent()` guards and the outgoing flush publishes.
 * - Downgrade the layout effect to `useEffect` and the guards cannot fire,
 *   because the refs they compare against have not been swapped yet.
 */
import { act, cleanup, renderHook } from '@testing-library/react';
import { useLayoutEffect, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLiveSource } from './types.js';
import type { PlaybackEvent } from './types.js';
import { usePlayback } from './usePlayback.js';

function makeLiveSource() {
  const listeners = new Set<(event: PlaybackEvent<string>) => void>();
  const source = createLiveSource<string>((onEvent) => {
    listeners.add(onEvent);
    return () => listeners.delete(onEvent);
  });
  return {
    source,
    emit: (event: PlaybackEvent<string>) => {
      for (const listener of listeners) listener(event);
    },
    listenerCount: () => listeners.size,
  };
}

const event = (seq: number): PlaybackEvent<string> => ({
  seq,
  timestamp: 1_000 + seq,
  component: 'worker.a',
  type: 'log',
  payload: `e${seq}`,
});

/** Runs once, in the layout phase of the next commit, then clears itself. */
let inTheWindow: (() => void) | null = null;

function Wrapper({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    const action = inTheWindow;
    inTheWindow = null;
    action?.();
  });
  return children;
}

describe('usePlayback (live source) — reset across a source switch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    inTheWindow = null;
    cleanup();
    vi.useRealTimers();
  });

  it('drops a flush from the outgoing source instead of publishing it', () => {
    const first = makeLiveSource();
    const second = makeLiveSource();
    const onEvent = vi.fn();

    const { result, rerender } = renderHook(
      ({ source }) => usePlayback({ source, onEvent }),
      { initialProps: { source: first.source }, wrapper: Wrapper },
    );

    act(() => first.emit(event(1)));
    act(() => vi.advanceTimersByTime(32));
    // CONTROL: the outgoing source really did accumulate an event, so an empty
    // list below can only mean the reset happened — not that nothing arrived.
    expect(result.current.events.map((e) => e.seq)).toEqual([1]);
    onEvent.mockClear();

    inTheWindow = () => {
      // CONTROL: this is the window — the switch has committed and the
      // outgoing subscription has NOT been torn down.
      expect(first.listenerCount()).toBe(1);
      first.emit(event(99));
      vi.advanceTimersByTime(32);
    };
    rerender({ source: second.source });
    // CONTROL: the window was entered at all.
    expect(inTheWindow).toBeNull();

    // Event 99 belongs to `first`. It must not appear under `second`, and it
    // must not reach the consumer's handler either.
    expect(result.current.events.map((e) => e.seq)).toEqual([]);
    expect(result.current.latestEvent).toBeNull();
    expect(onEvent).not.toHaveBeenCalled();
    expect(result.current.status).toBe('connecting');

    // ...and the incoming source is unharmed by any of it.
    act(() => second.emit(event(7)));
    act(() => vi.advanceTimersByTime(32));
    expect(result.current.events.map((e) => e.seq)).toEqual([7]);
    expect(onEvent.mock.calls.map(([e]) => e.seq)).toEqual([7]);
    expect(result.current.status).toBe('connected');
  });
});
