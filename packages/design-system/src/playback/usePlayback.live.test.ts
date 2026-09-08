/**
 * @vitest-environment jsdom
 *
 * Pins the live-source identity contract documented on `events` in
 * `UsePlaybackResult`: each flush hands back a fresh immutable snapshot over a
 * buffer that grew IN PLACE, so identity tracks the contents while the append
 * stays O(batch). That contract is invisible to a pure-function test — it is a
 * property of what the hook hands back across successive commits.
 *
 * The consumer-facing consequence (memoized derivations invalidate correctly)
 * is pinned separately in `usePlayback.memo.test.ts`.
 */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLiveSource } from './types.js';
import type { PlaybackEvent, PlaybackSourceStatus } from './types.js';
import { usePlayback } from './usePlayback.js';

type Emit = (event: PlaybackEvent<string>) => void;

/**
 * A live source whose `emit` / `setStatus` are driven by the test rather than a
 * transport. `subscribeCount` is how a test tells a re-render apart from a
 * re-SUBSCRIBE — the latter resets the accumulated buffer.
 */
function makeLiveSource(): {
  source: ReturnType<typeof createLiveSource<string>>;
  emit: Emit;
  setStatus: (status: PlaybackSourceStatus) => void;
  subscribeCount: () => number;
} {
  const listeners = new Set<(event: PlaybackEvent<string>) => void>();
  const statusListeners = new Set<(status: PlaybackSourceStatus) => void>();
  let subscribeCount = 0;
  const source = createLiveSource<string>(
    (onEvent) => {
      subscribeCount += 1;
      listeners.add(onEvent);
      return () => listeners.delete(onEvent);
    },
    (onStatus) => {
      statusListeners.add(onStatus);
      return () => statusListeners.delete(onStatus);
    },
  );
  return {
    source,
    emit: (event) => {
      for (const listener of listeners) listener(event);
    },
    setStatus: (status) => {
      for (const listener of statusListeners) listener(status);
    },
    subscribeCount: () => subscribeCount,
  };
}

const event = (seq: number): PlaybackEvent<string> => ({
  seq,
  timestamp: 1_000 + seq,
  component: 'worker.a',
  type: 'log',
  payload: `e${seq}`,
});

/** Let the rAF batcher deliver whatever has been pushed. */
function flushBatcher(): void {
  act(() => {
    vi.advanceTimersByTime(32);
  });
}

describe('usePlayback (live source)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('surfaces flushed events and the latest one', () => {
    const { source, emit } = makeLiveSource();
    const { result } = renderHook(() => usePlayback({ source }));

    expect(result.current.mode).toBe('live');
    expect(result.current.events).toEqual([]);

    act(() => {
      emit(event(1));
      emit(event(2));
    });
    flushBatcher();

    expect(result.current.events.map((e) => e.seq)).toEqual([1, 2]);
    expect(result.current.latestEvent?.seq).toBe(2);
    expect(result.current.clock).toBe(event(2).timestamp);
  });

  it('hands back a fresh identity per flush, leaving older snapshots frozen', () => {
    const { source, emit } = makeLiveSource();
    const { result } = renderHook(() => usePlayback({ source }));

    act(() => {
      emit(event(1));
    });
    flushBatcher();
    const afterFirstFlush = result.current.events;

    act(() => {
      emit(event(2));
    });
    flushBatcher();

    expect(result.current.events).not.toBe(afterFirstFlush);
    expect(result.current.events.map((e) => e.seq)).toEqual([1, 2]);
    // The earlier snapshot is pinned to the prefix it was taken over, even
    // though the buffer underneath it grew — so a render holding it can't tear.
    expect(afterFirstFlush.map((e) => e.seq)).toEqual([1]);
  });

  it('hands back a read-only snapshot', () => {
    const { source, emit } = makeLiveSource();
    const { result } = renderHook(() => usePlayback({ source }));

    act(() => {
      emit(event(1));
    });
    flushBatcher();

    // Writing through the snapshot would corrupt (or, via `length`, truncate)
    // the shared buffer, so it throws instead.
    expect(() => result.current.events.push(event(2))).toThrow(TypeError);
    expect(result.current.events.map((e) => e.seq)).toEqual([1]);
  });

  it('hands back a fresh, empty array when the source identity resets', () => {
    const first = makeLiveSource();
    const { result, rerender } = renderHook(
      ({ source }) => usePlayback({ source }),
      { initialProps: { source: first.source } },
    );

    act(() => {
      first.emit(event(1));
    });
    flushBatcher();
    const firstEvents = result.current.events;
    expect(firstEvents).toHaveLength(1);

    const second = makeLiveSource();
    rerender({ source: second.source });

    expect(result.current.events).not.toBe(firstEvents);
    expect(result.current.events).toEqual([]);
    expect(result.current.latestEvent).toBeNull();
    // The clock is re-baselined with the rest of the per-source reset. Leaving
    // it on the removed stream's last event would hand back the documented
    // "empty list" alongside a timestamp from a stream that is gone.
    expect(result.current.clock).not.toBe(event(1).timestamp);
    expect(result.current.clock).toBe(Date.now());

    act(() => {
      second.emit(event(9));
    });
    flushBatcher();
    expect(result.current.events.map((e) => e.seq)).toEqual([9]);
  });

  it('keeps the buffer when only autoplay changes', () => {
    const { source, emit, subscribeCount } = makeLiveSource();
    const { result, rerender } = renderHook(
      ({ autoplay }) => usePlayback({ source, autoplay }),
      { initialProps: { autoplay: true } },
    );

    act(() => {
      emit(event(1));
    });
    flushBatcher();
    expect(result.current.events.map((e) => e.seq)).toEqual([1]);
    expect(subscribeCount()).toBe(1);

    // `autoplay` is INITIAL intent, per-source; play()/pause() own the
    // transport afterwards. Toggling it on a stable source must not wipe the
    // accumulated feed or rebuild the subscription underneath it.
    rerender({ autoplay: false });

    expect(result.current.events.map((e) => e.seq)).toEqual([1]);
    expect(subscribeCount()).toBe(1);

    act(() => {
      emit(event(2));
    });
    flushBatcher();
    expect(result.current.events.map((e) => e.seq)).toEqual([1, 2]);
  });

  it('flushes the pending frame on pause, keeping arrival order across a play', () => {
    const { source, emit } = makeLiveSource();
    const onEvent = vi.fn();
    const { result } = renderHook(() => usePlayback({ source, onEvent }));

    // Two events arrive and sit in the rAF batcher: a frame has NOT run yet.
    act(() => {
      emit(event(1));
      emit(event(2));
    });

    // Pause inside that same frame. A third event arrives while paused, so it
    // goes to the pause backlog instead of the batcher...
    act(() => {
      result.current.pause();
    });
    act(() => {
      emit(event(3));
    });
    // ...and play() drains that backlog synchronously. If pause left the
    // batcher's frame pending, the OLDER pair lands after the newer event:
    // events out of order, `clock` travelling backwards, `onEvent` out of
    // order.
    act(() => {
      result.current.play();
    });
    flushBatcher();

    expect(result.current.events.map((e) => e.seq)).toEqual([1, 2, 3]);
    expect(onEvent.mock.calls.map(([e]) => e.seq)).toEqual([1, 2, 3]);
    expect(result.current.clock).toBe(event(3).timestamp);
  });

  it('keeps an error status through play and pause', () => {
    const { source, setStatus } = makeLiveSource();
    const { result } = renderHook(() => usePlayback({ source }));

    act(() => {
      setStatus('error');
    });
    expect(result.current.status).toBe('error');

    // A dead transport stays dead: pressing the transport controls must not
    // paint over it with 'connected'/'paused'.
    act(() => {
      result.current.play();
    });
    expect(result.current.status).toBe('error');

    act(() => {
      result.current.pause();
    });
    expect(result.current.status).toBe('error');
  });

  it('surfaces a completed live stream instead of staying connected forever', () => {
    const { source, emit, setStatus } = makeLiveSource();
    const { result } = renderHook(() => usePlayback({ source }));

    act(() => {
      emit(event(1));
    });
    flushBatcher();
    expect(result.current.status).toBe('connected');

    act(() => {
      setStatus('complete');
    });
    expect(result.current.status).toBe('complete');

    // Terminal in the same way replay completion is terminal.
    act(() => {
      result.current.play();
    });
    expect(result.current.status).toBe('complete');
  });

  it('surfaces an idle source status', () => {
    const { source, setStatus } = makeLiveSource();
    const { result } = renderHook(() => usePlayback({ source }));

    act(() => {
      setStatus('idle');
    });
    expect(result.current.status).toBe('idle');
  });

  it('buffers while paused and releases the backlog on play, in order', () => {
    const { source, emit } = makeLiveSource();
    const { result } = renderHook(() => usePlayback({ source }));

    act(() => {
      result.current.pause();
    });
    expect(result.current.status).toBe('paused');

    act(() => {
      emit(event(1));
      emit(event(2));
    });
    flushBatcher();
    expect(result.current.events).toEqual([]);

    act(() => {
      result.current.play();
    });
    expect(result.current.events.map((e) => e.seq)).toEqual([1, 2]);
    // This source reports no transport status, so `connected` is the right
    // answer for it. NOTE: `play()` sets it unconditionally, which is wrong
    // for a source that last reported `error` or `connecting` — a live-path
    // bug tracked separately, deliberately not pinned by this suite.
    expect(result.current.status).toBe('connected');
  });

  it('reports each event to onEvent exactly once, in arrival order', () => {
    const { source, emit } = makeLiveSource();
    const onEvent = vi.fn();
    const { result, rerender } = renderHook(
      ({ handler }) => usePlayback({ source, onEvent: handler }),
      { initialProps: { handler: onEvent } },
    );

    act(() => {
      emit(event(1));
    });
    flushBatcher();
    expect(onEvent.mock.calls.map(([e]) => e.seq)).toEqual([1]);

    // A fresh inline callback must be picked up WITHOUT re-subscribing (which
    // would reset the accumulated buffer).
    const nextHandler = vi.fn();
    const beforeRerender = result.current.events;
    rerender({ handler: nextHandler });

    act(() => {
      emit(event(2));
    });
    flushBatcher();

    expect(nextHandler.mock.calls.map(([e]) => e.seq)).toEqual([2]);
    expect(onEvent).toHaveBeenCalledTimes(1);
    // Not re-subscribed: the buffer ACCUMULATED across the re-render rather
    // than resetting to just the post-re-render event.
    expect(beforeRerender.map((e) => e.seq)).toEqual([1]);
    expect(result.current.events.map((e) => e.seq)).toEqual([1, 2]);
  });
});
