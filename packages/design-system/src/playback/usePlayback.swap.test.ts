/**
 * @vitest-environment jsdom
 *
 * Pins the live-side invalidation for the swap the reset suite does not cover:
 * the one where the INCOMING source is a replay.
 *
 * `usePlayback.reset.test.ts` proves the live -> live swap holds. Everything it
 * relies on — the buffer swap that makes a superseded flush recognise itself,
 * the clock re-baseline — is live-side state belonging to the OUTGOING source,
 * and letting go of it cannot depend on what the incoming source happens to be.
 * A swap to a replay log has to invalidate exactly as much.
 *
 * Two consequences of getting that wrong, one per test:
 *
 * - The outgoing subscription's `isCurrent()` still answers true, so a flush
 *   that beats the passive teardown publishes an event belonging to a source
 *   nobody selected. This test stands in that window the same way the reset
 *   suite does — a wrapper's `useLayoutEffect` runs after the hook's, before
 *   any passive effect — and emits on the outgoing source from inside it.
 * - The clock's baseline pointer still names the outgoing live source, so
 *   returning to that SAME source reads as "no swap happened" and skips the
 *   re-baseline, leaving an empty `events` paired with a timestamp from the
 *   previous run. `clock` is documented to read mount time until the first
 *   event arrives on the source.
 */
import { act, cleanup, renderHook } from '@testing-library/react';
import { useLayoutEffect, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLiveSource, createReplaySource } from './types.js';
import type { PlaybackEvent, PlaybackSource } from './types.js';
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

/**
 * An EMPTY replay log, deliberately: a log with events fires `onEvent` for
 * every event the initial clock has already crossed, which would blur the one
 * assertion the first test is making about who `onEvent` was called for.
 */
const emptyReplay = () => createReplaySource<string>([]);

/**
 * `renderHook` infers its props type from `initialProps`, which would pin these
 * suites to whichever kind of source they mounted with. Widening it once here
 * is what lets a test rerender with the other kind.
 */
const props = (source: PlaybackSource<string>) => ({ source });

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

const MOUNT_TIME = 1_700_000_000_000;
const RETURN_TIME = 1_700_000_500_000;

describe('usePlayback — swapping a live source out for a replay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    inTheWindow = null;
    cleanup();
    vi.useRealTimers();
  });

  it('drops a flush from the outgoing live source', () => {
    const live = makeLiveSource();
    const replay = emptyReplay();
    const onEvent = vi.fn();

    const { result, rerender } = renderHook(
      ({ source }) => usePlayback({ source, onEvent }),
      { initialProps: props(live.source), wrapper: Wrapper },
    );

    act(() => live.emit(event(1)));
    act(() => vi.advanceTimersByTime(32));
    // CONTROL: the outgoing source really did accumulate an event and really
    // did reach the handler, so silence below can only mean the invalidation
    // happened — not that nothing arrived.
    expect(result.current.events.map((e) => e.seq)).toEqual([1]);
    expect(onEvent.mock.calls.map(([e]) => e.seq)).toEqual([1]);
    onEvent.mockClear();

    inTheWindow = () => {
      // CONTROL: this is the window — the switch has committed and the
      // outgoing subscription has NOT been torn down.
      expect(live.listenerCount()).toBe(1);
      live.emit(event(99));
      vi.advanceTimersByTime(32);
    };
    rerender(props(replay));
    // CONTROL: the window was entered at all.
    expect(inTheWindow).toBeNull();

    // Event 99 belongs to the live source, which is no longer selected. The
    // replay log is empty, so the handler must not have been called at all.
    expect(onEvent).not.toHaveBeenCalled();
    expect(result.current.mode).toBe('replay');
    expect(result.current.events).toEqual([]);
    expect(result.current.latestEvent).toBeNull();
  });

  it('re-baselines the clock when the same live source is re-selected', () => {
    const live = makeLiveSource();
    const replay = emptyReplay();

    vi.setSystemTime(MOUNT_TIME);
    const { result, rerender } = renderHook(
      ({ source }) => usePlayback({ source }),
      { initialProps: props(live.source) },
    );

    expect(result.current.clock).toBe(MOUNT_TIME);

    act(() => live.emit(event(1)));
    act(() => vi.advanceTimersByTime(32));
    // CONTROL: the clock has moved off its mount baseline onto event time, so
    // a mount-time reading after the round trip can only come from a real
    // re-baseline.
    expect(result.current.clock).toBe(event(1).timestamp);

    rerender(props(replay));
    expect(result.current.mode).toBe('replay');

    vi.setSystemTime(RETURN_TIME);
    rerender(props(live.source));

    // Back on the live source, with nothing accumulated: `clock` must read the
    // moment the source was re-selected, not a timestamp from its previous run.
    expect(result.current.mode).toBe('live');
    expect(result.current.events).toEqual([]);
    expect(result.current.clock).toBe(RETURN_TIME);

    // ...and the re-selected source is otherwise healthy.
    act(() => live.emit(event(2)));
    act(() => vi.advanceTimersByTime(32));
    expect(result.current.events.map((e) => e.seq)).toEqual([2]);
    expect(result.current.clock).toBe(event(2).timestamp);
  });
});
