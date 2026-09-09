/**
 * @vitest-environment jsdom
 *
 * Pins the replay-side per-log resets that `usePlayback.reset.test.ts` pins
 * for live sources. Replay keeps three pieces of per-log state — the clock,
 * the status, and the `onEvent` cursor — and only the first two are reset by
 * the render-time adjustment; the cursor lives in a ref and is reset in the
 * layout phase. These tests stand on the seams between them:
 *
 * - Switching to a log that ends BEFORE the current clock must reset, not run
 *   the end-of-log test against the stale clock (which parked the new log in
 *   'complete' at its own first event), and must not let the stale cursor
 *   read past the shorter log's end.
 * - The cursor must restart from the top of the new log, or its earliest
 *   events silently never fire `onEvent`.
 * - Completion is sticky in one direction only: a backward seek out of
 *   'complete' lands in 'paused', never silently resumes playing.
 */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createReplaySource } from './types.js';
import type { PlaybackEvent } from './types.js';
import { usePlayback } from './usePlayback.js';

function makeEvents(timestamps: number[]): PlaybackEvent<string>[] {
  return timestamps.map((timestamp, seq) => ({
    seq,
    timestamp,
    component: 'worker.a',
    type: 'log',
    payload: `event-${seq}`,
  }));
}

afterEach(cleanup);

describe('usePlayback replay source switching', () => {
  it('resets a log that ends before the current clock instead of completing it', () => {
    const longSource = createReplaySource(
      makeEvents([1000, 2000, 3000, 4000, 5000]),
    );
    const shortSource = createReplaySource(makeEvents([1000, 2000]));

    const { result, rerender } = renderHook(
      ({ source }: { source: typeof longSource }) =>
        usePlayback({ source, autoplay: false }),
      { initialProps: { source: longSource } },
    );

    act(() => result.current.seekTo(5000));
    expect(result.current.clock).toBe(5000);
    expect(result.current.events).toHaveLength(5);

    rerender({ source: shortSource });

    // The reset lands in the same committed render as the new source: clock
    // back at the new log's start and status per `autoplay` — the end-of-log
    // test was never applied to the previous log's clock.
    expect(result.current.status).toBe('paused');
    expect(result.current.clock).toBe(1000);
    expect(result.current.bounds).toEqual({ start: 1000, end: 2000 });
    expect(result.current.events).toHaveLength(1);
  });

  it('fires onEvent from the top of a newly-switched log', () => {
    const longSource = createReplaySource(
      makeEvents([1000, 2000, 3000, 4000, 5000]),
    );
    const shortSource = createReplaySource(makeEvents([1000, 2000]));
    const onEvent = vi.fn();

    const { result, rerender } = renderHook(
      ({ source }: { source: typeof longSource }) =>
        usePlayback({ source, autoplay: false, onEvent }),
      { initialProps: { source: longSource } },
    );

    // Park the cursor at the END of the long log, the position from which a
    // stale cursor either reads past a shorter log or skips its early events.
    act(() => result.current.seekTo(5000));
    expect(onEvent).toHaveBeenCalledTimes(5);
    onEvent.mockClear();

    rerender({ source: shortSource });
    act(() => result.current.seekTo(2000));

    // The new log emits from its first event, exactly as a fresh mount would.
    expect(onEvent.mock.calls.map(([event]) => event.payload)).toEqual([
      'event-0',
      'event-1',
    ]);
  });

  it("leaves a backward seek out of 'complete' paused, not playing", () => {
    const source = createReplaySource(makeEvents([1000, 2000, 3000]));

    const { result } = renderHook(() =>
      usePlayback({ source, autoplay: true }),
    );
    expect(result.current.status).toBe('playing');

    act(() => result.current.seekTo(3000));
    expect(result.current.status).toBe('complete');

    act(() => result.current.seekTo(2000));
    expect(result.current.status).toBe('paused');
    expect(result.current.clock).toBe(2000);
  });
});
