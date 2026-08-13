import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useIdentityChurnWarning } from '../hooks/useIdentityChurnWarning.js';
import { createRafBatcher } from './rafBatch.js';
import type { PlaybackBounds, PlaybackEvent, PlaybackSource } from './types.js';

export type PlaybackMode = 'live' | 'replay';

export type PlaybackStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'playing'
  | 'paused'
  | 'complete'
  | 'error';

export type StepDirection = 'forward' | 'backward';

export type UsePlaybackOptions<TPayload = unknown> = {
  /** The transport: a live push source or a replayed append-only log. Swapping this is the whole "one view, two modes" trick — the rest of this hook's return shape stays identical either way. */
  source: PlaybackSource<TPayload>;
  /**
   * Fires for each event as it becomes current: a live arrival while
   * playing, or each replay event the virtual clock crosses moving forward
   * (play, seek, or step). Not called retroactively for events already
   * behind the clock at mount — read `events` for the full "as of now" list.
   */
  onEvent?: (event: PlaybackEvent<TPayload>) => void;
  /** Replay-only: initial speed multiplier. Defaults to 1 (wall-clock accurate). */
  initialSpeed?: number;
  /**
   * Start playing immediately. Defaults to `false` for replay (start paused,
   * scrubbed to the first event — the operator presses play) and `true` for
   * live (a monitor should start following the feed as soon as it mounts).
   */
  autoplay?: boolean;
};

export type UsePlaybackResult<TPayload = unknown> = {
  mode: PlaybackMode;
  status: PlaybackStatus;
  /**
   * Virtual clock, epoch ms. Replay: the scrub position, advanced by the
   * wall-clock delta * `speed` each frame while playing. Live: the
   * timestamp of the latest surfaced event (or the hook's mount time before
   * the first one arrives).
   */
  clock: number;
  /** Replay-only time bounds (first/last event timestamp); `null` for live sources. */
  bounds: PlaybackBounds | null;
  /** Replay speed multiplier; always `1` for live sources (arrival rate isn't ours to accelerate). */
  speed: number;
  /**
   * Every event surfaced so far, oldest first. Replay: all events with
   * `timestamp <= clock`. Live: the accumulated buffer since mount (or since
   * the source identity last changed).
   */
  events: PlaybackEvent<TPayload>[];
  latestEvent: PlaybackEvent<TPayload> | null;
  play(): void;
  pause(): void;
  /** Replay-only; no-op for live sources. */
  setSpeed(multiplier: number): void;
  /** Replay-only; no-op for live sources. Clamped to `bounds`. */
  seekTo(timestamp: number): void;
  /** Replay-only; no-op for live sources. Jumps to the next/previous event's timestamp (event-stepping, not time-stepping). */
  step(direction?: StepDirection): void;
};

function sortEvents<T>(events: PlaybackEvent<T>[]): PlaybackEvent<T>[] {
  return [...events].sort((a, b) =>
    a.timestamp === b.timestamp ? a.seq - b.seq : a.timestamp - b.timestamp,
  );
}

/**
 * Drives one virtual clock over a transport-agnostic `PlaybackSource`. The
 * consumer (a component rendering a display) only ever reads `events` /
 * `latestEvent` / `clock` / `status` — it never branches on `mode` itself,
 * which is what lets the same rendering serve a live monitor and an
 * accelerated replay.
 */
export function usePlayback<TPayload = unknown>({
  source,
  onEvent,
  initialSpeed = 1,
  autoplay,
}: UsePlaybackOptions<TPayload>): UsePlaybackResult<TPayload> {
  // `source` must be memoized by the caller — a fresh source each render
  // re-subscribes playback every render. Warns once, dev-only, if it churns.
  useIdentityChurnWarning(source, 'usePlayback source');

  const mode: PlaybackMode = source.kind;

  // Keep the latest onEvent in a ref so effects don't need to re-run (and
  // live sources don't need to re-subscribe) whenever the caller passes a new
  // inline callback.
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  // ---- Replay --------------------------------------------------------

  const sortedEvents = useMemo(
    () => (source.kind === 'replay' ? sortEvents(source.events) : []),
    [source],
  );

  const bounds: PlaybackBounds | null = useMemo(() => {
    if (source.kind !== 'replay' || sortedEvents.length === 0) return null;
    return {
      start: sortedEvents[0]!.timestamp,
      end: sortedEvents[sortedEvents.length - 1]!.timestamp,
    };
  }, [source, sortedEvents]);

  const replayAutoplay = autoplay ?? false;
  const [replayClock, setReplayClock] = useState<number>(
    () => bounds?.start ?? 0,
  );
  const [speed, setSpeedState] = useState(initialSpeed);
  const [replayStatus, setReplayStatus] = useState<PlaybackStatus>(
    replayAutoplay ? 'playing' : 'paused',
  );

  // Reset the scrub position + status whenever the underlying log identity
  // changes (a new source object — e.g. switching which component's log is
  // being viewed).
  useEffect(() => {
    if (source.kind !== 'replay') return;
    setReplayClock(bounds?.start ?? 0);
    setReplayStatus(replayAutoplay ? 'playing' : 'paused');
  }, [source, bounds, replayAutoplay]);

  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (mode !== 'replay' || replayStatus !== 'playing' || !bounds) {
      lastFrameRef.current = null;
      return;
    }

    const tick = (now: number) => {
      const last = lastFrameRef.current;
      lastFrameRef.current = now;
      if (last != null) {
        setReplayClock((previous) => {
          const next = previous + (now - last) * speed;
          return next >= bounds.end ? bounds.end : next;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      lastFrameRef.current = null;
    };
  }, [mode, replayStatus, bounds, speed]);

  // Flip to 'complete' exactly once the clock reaches the end.
  useEffect(() => {
    if (
      mode === 'replay' &&
      bounds &&
      replayClock >= bounds.end &&
      replayStatus === 'playing'
    ) {
      setReplayStatus('complete');
    }
  }, [mode, bounds, replayClock, replayStatus]);

  // Fire onEvent for newly-crossed events as the clock moves forward; rewind
  // the cursor on a backward seek so re-crossing forward fires again (mirrors
  // how a media player re-fires timeupdate-driven callbacks after a rewind).
  const lastEmittedIndexRef = useRef(-1);
  useEffect(() => {
    if (mode !== 'replay') return;
    let index = lastEmittedIndexRef.current;
    while (
      index + 1 < sortedEvents.length &&
      sortedEvents[index + 1]!.timestamp <= replayClock
    ) {
      index += 1;
      onEventRef.current?.(sortedEvents[index]!);
    }
    while (index >= 0 && sortedEvents[index]!.timestamp > replayClock) {
      index -= 1;
    }
    lastEmittedIndexRef.current = index;
  }, [mode, replayClock, sortedEvents]);

  const replayEvents = useMemo(
    () => sortedEvents.filter((event) => event.timestamp <= replayClock),
    [sortedEvents, replayClock],
  );

  // ---- Live -----------------------------------------------------------

  const liveAutoplay = autoplay ?? true;
  const [liveEvents, setLiveEvents] = useState<PlaybackEvent<TPayload>[]>([]);
  const [liveClock, setLiveClock] = useState<number>(() => Date.now());
  const [liveStatus, setLiveStatus] = useState<PlaybackStatus>(
    liveAutoplay ? 'connecting' : 'paused',
  );
  const livePlayingRef = useRef(liveAutoplay);
  const liveBufferRef = useRef<PlaybackEvent<TPayload>[]>([]);

  useEffect(() => {
    if (source.kind !== 'live') return;
    livePlayingRef.current = liveAutoplay;
    liveBufferRef.current = [];
    setLiveEvents([]);
    setLiveStatus(liveAutoplay ? 'connecting' : 'paused');

    // A frame's worth of arriving events collapse into ONE `setLiveEvents`
    // call (one array copy) instead of one per event — see rafBatch.ts.
    // `onEvent` still fires per event, in arrival order, on flush: batching
    // the state *commit* is the optimization, not the event contract a
    // consumer observes.
    const batcher = createRafBatcher<PlaybackEvent<TPayload>>((batch) => {
      setLiveEvents((previous) => [...previous, ...batch]);
      const last = batch[batch.length - 1];
      if (last) setLiveClock(last.timestamp);
      for (const event of batch) onEventRef.current?.(event);
      setLiveStatus((current) =>
        current === 'connecting' ? 'connected' : current,
      );
    });

    const unsubscribeEvents = source.subscribe((event) => {
      if (!livePlayingRef.current) {
        liveBufferRef.current.push(event);
        return;
      }
      batcher.push(event);
    });

    const unsubscribeStatus = source.subscribeStatus?.((status) => {
      if (status === 'connected') {
        setLiveStatus(livePlayingRef.current ? 'connected' : 'paused');
      } else if (status === 'connecting') {
        setLiveStatus(livePlayingRef.current ? 'connecting' : 'paused');
      } else if (status === 'error') {
        setLiveStatus('error');
      }
    });

    return () => {
      unsubscribeEvents();
      unsubscribeStatus?.();
      batcher.dispose();
    };
  }, [source, liveAutoplay]);

  // ---- Shared controls --------------------------------------------------

  const play = useCallback(() => {
    if (mode === 'replay') {
      setReplayStatus((current) =>
        current === 'complete' ? current : 'playing',
      );
      return;
    }
    livePlayingRef.current = true;
    setLiveStatus('connected');
    if (liveBufferRef.current.length > 0) {
      const buffered = liveBufferRef.current;
      liveBufferRef.current = [];
      setLiveEvents((previous) => [...previous, ...buffered]);
      const last = buffered[buffered.length - 1];
      if (last) setLiveClock(last.timestamp);
      buffered.forEach((event) => onEventRef.current?.(event));
    }
  }, [mode]);

  const pause = useCallback(() => {
    if (mode === 'replay') {
      setReplayStatus((current) =>
        current === 'complete' ? current : 'paused',
      );
      return;
    }
    livePlayingRef.current = false;
    setLiveStatus('paused');
  }, [mode]);

  const setSpeed = useCallback(
    (multiplier: number) => {
      if (mode !== 'replay') return; // no-op for live: arrival rate isn't ours to accelerate.
      setSpeedState(multiplier);
    },
    [mode],
  );

  const seekTo = useCallback(
    (timestamp: number) => {
      if (mode !== 'replay' || !bounds) return; // no-op for live: can't scrub a live feed.
      const clamped = Math.min(bounds.end, Math.max(bounds.start, timestamp));
      setReplayClock(clamped);
      setReplayStatus((current) =>
        current === 'complete' && clamped < bounds.end ? 'paused' : current,
      );
    },
    [mode, bounds],
  );

  const step = useCallback(
    (direction: StepDirection = 'forward') => {
      if (mode !== 'replay' || sortedEvents.length === 0) return; // no-op for live.
      if (direction === 'forward') {
        const next = sortedEvents.find(
          (event) => event.timestamp > replayClock,
        );
        if (next) seekTo(next.timestamp);
        else if (bounds) seekTo(bounds.end);
      } else {
        const previous = [...sortedEvents]
          .reverse()
          .find((event) => event.timestamp < replayClock);
        if (previous) seekTo(previous.timestamp);
        else if (bounds) seekTo(bounds.start);
      }
    },
    [mode, sortedEvents, replayClock, bounds, seekTo],
  );

  if (mode === 'replay') {
    return {
      mode,
      status: replayStatus,
      clock: replayClock,
      bounds,
      speed,
      events: replayEvents,
      latestEvent: replayEvents[replayEvents.length - 1] ?? null,
      play,
      pause,
      setSpeed,
      seekTo,
      step,
    };
  }

  return {
    mode,
    status: liveStatus,
    clock: liveClock,
    bounds: null,
    speed: 1,
    events: liveEvents,
    latestEvent: liveEvents[liveEvents.length - 1] ?? null,
    play,
    pause,
    setSpeed,
    seekTo,
    step,
  };
}
