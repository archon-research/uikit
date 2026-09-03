/**
 * @vitest-environment jsdom
 *
 * The React Compiler hazard, reproduced without the compiler.
 *
 * A compiled consumer never writes a dependency array: the compiler infers one
 * from what the expression reads and caches the result against those values by
 * identity. For `summarize(playback.events)` that inferred cache key is the
 * `events` array identity — exactly the `useMemo(..., [events])` written by
 * hand below. So this suite pins the property the compiler depends on, in the
 * form a consumer can actually observe: DERIVING FROM `events` MUST RECOMPUTE
 * WHENEVER THE SURFACED EVENTS CHANGE, AND MUST NOT WHEN THEY DO NOT.
 *
 * Every test here asserts a CONTROL first — that `events` itself reached the
 * expected contents — so a failure can only mean the derived value went stale,
 * never that the harness failed to drive a flush.
 */
import { act, cleanup, renderHook } from '@testing-library/react';
import { useMemo } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLiveSource } from './types.js';
import type { PlaybackEvent } from './types.js';
import { usePlayback } from './usePlayback.js';

function makeLiveSource(): {
  source: ReturnType<typeof createLiveSource<string>>;
  emit: (event: PlaybackEvent<string>) => void;
} {
  const listeners = new Set<(event: PlaybackEvent<string>) => void>();
  const source = createLiveSource<string>((onEvent) => {
    listeners.add(onEvent);
    return () => listeners.delete(onEvent);
  });
  return {
    source,
    emit: (event) => {
      for (const listener of listeners) listener(event);
    },
  };
}

const event = (seq: number): PlaybackEvent<string> => ({
  seq,
  timestamp: 1_000 + seq,
  component: 'worker.a',
  type: 'log',
  payload: `e${seq}`,
});

/** Let the rAF batcher deliver whatever has been pushed — as in `usePlayback.live.test.ts`. */
function flushBatcher(): void {
  act(() => {
    vi.advanceTimersByTime(32);
  });
}

describe('usePlayback (live source) — derived-value invalidation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('invalidates a consumer memo keyed on `events` when a flush appends', () => {
    const { source, emit } = makeLiveSource();
    const summarize = (events: PlaybackEvent<string>[]) =>
      events.map((e) => e.seq).join(',');

    const { result } = renderHook(() => {
      const playback = usePlayback({ source });
      // Written by hand here; written FOR the consumer, on this exact key, by
      // the React Compiler.
      const summary = useMemo(
        () => summarize(playback.events),
        [playback.events],
      );
      return { playback, summary };
    });

    act(() => {
      emit(event(1));
    });
    flushBatcher();
    // CONTROL: the flush demonstrably happened.
    expect(result.current.playback.events.map((e) => e.seq)).toEqual([1]);
    // The derived value must have seen it.
    expect(result.current.summary).toBe('1');

    act(() => {
      emit(event(2));
      emit(event(3));
    });
    flushBatcher();
    // CONTROL again, after a second flush.
    expect(result.current.playback.events.map((e) => e.seq)).toEqual([1, 2, 3]);
    expect(result.current.summary).toBe('1,2,3');
  });

  it('invalidates that memo when a paused backlog is released on play', () => {
    const { source, emit } = makeLiveSource();
    const { result } = renderHook(() => {
      const playback = usePlayback({ source });
      const count = useMemo(() => playback.events.length, [playback.events]);
      return { playback, count };
    });

    act(() => {
      emit(event(1));
    });
    flushBatcher();
    expect(result.current.playback.events).toHaveLength(1); // CONTROL
    expect(result.current.count).toBe(1);

    act(() => {
      result.current.playback.pause();
    });
    act(() => {
      emit(event(2));
      emit(event(3));
    });
    flushBatcher();
    act(() => {
      result.current.playback.play();
    });

    expect(result.current.playback.events).toHaveLength(3); // CONTROL
    expect(result.current.count).toBe(3);
  });

  it('does NOT invalidate that memo on a re-render that surfaced nothing new', () => {
    // The guard against "just hand back a fresh array every render": that would
    // fix staleness by making every consumer memo recompute on every render,
    // which is a different bug wearing the same fix.
    const { source, emit } = makeLiveSource();
    const summarize = vi.fn((events: PlaybackEvent<string>[]) => events.length);

    const { result, rerender } = renderHook(
      ({ tick }: { tick: number }) => {
        const playback = usePlayback({ source });
        const count = useMemo(
          () => summarize(playback.events),
          [playback.events],
        );
        return { playback, count, tick };
      },
      { initialProps: { tick: 0 } },
    );

    act(() => {
      emit(event(1));
    });
    flushBatcher();
    expect(result.current.playback.events).toHaveLength(1); // CONTROL
    const callsAfterFlush = summarize.mock.calls.length;

    rerender({ tick: 1 });
    rerender({ tick: 2 });

    expect(result.current.tick).toBe(2);
    expect(summarize.mock.calls.length).toBe(callsAfterFlush);
  });
});
