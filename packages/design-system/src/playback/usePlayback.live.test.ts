/**
 * @vitest-environment jsdom
 *
 * Pins the live-source identity contract documented on `events` in
 * `UsePlaybackResult`: the accumulated buffer grows IN PLACE, so its identity
 * is stable across flushes and changes only when the source identity resets.
 * That contract is the reason the buffer is not rebuilt per flush, and it is
 * invisible to a pure-function test — it is a property of what the hook hands
 * back across successive commits.
 */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLiveSource } from './types.js';
import type { PlaybackEvent } from './types.js';
import { usePlayback } from './usePlayback.js';

type Emit = (event: PlaybackEvent<string>) => void;

/** A live source whose `emit` is driven by the test rather than a transport. */
function makeLiveSource(): {
  source: ReturnType<typeof createLiveSource<string>>;
  emit: Emit;
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

  it('keeps ONE array identity across flushes while it grows', () => {
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

    expect(result.current.events).toBe(afterFirstFlush);
    expect(result.current.events.map((e) => e.seq)).toEqual([1, 2]);
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

    act(() => {
      second.emit(event(9));
    });
    flushBatcher();
    expect(result.current.events.map((e) => e.seq)).toEqual([9]);
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
    expect(result.current.events).toBe(beforeRerender);
  });
});
