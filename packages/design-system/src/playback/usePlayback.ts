import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useIdentityChurnWarning } from '../hooks/useIdentityChurnWarning.js';
import { createAppendOnlyBuffer } from './appendOnlyBuffer.js';
import type { AppendOnlyBuffer } from './appendOnlyBuffer.js';
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
   * `timestamp <= clock`. Live: everything accumulated since mount, or since
   * the source identity last changed.
   *
   * Either way this is an immutable snapshot with a sound identity: a FRESH
   * identity whenever the contents change, the SAME identity whenever they
   * don't. So `useMemo(() => summarize(events), [events])` is correct with no
   * extra care — as is the equivalent dependency the React Compiler infers on
   * your behalf, which is the case a consumer cannot opt out of.
   *
   * It is read-only. Mutating it in place (`push`, `sort`, `reverse`) throws a
   * `TypeError`; copy first (`[...events].sort(...)`). For the same reason it
   * is not directly `structuredClone`able — clone a copy.
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
 * The `events` value a live source is reset to. One shared snapshot rather than
 * a fresh empty buffer's, because the contract on `events` is that identity
 * changes exactly when the CONTENTS change — and two resets in a row are two
 * empty lists. It is a real snapshot, not `[]`, so writing through it throws
 * immediately after a reset just as it does after a flush.
 */
const EMPTY_LIVE_EVENTS = createAppendOnlyBuffer<never>().snapshot();

/**
 * `useLayoutEffect`, except on the server, where React warns that it does
 * nothing — correctly, and harmlessly here: nothing subscribes to a live source
 * during a server render, so there is no superseded flush for the layout timing
 * to protect against. See the reset below for why the timing matters on the
 * client.
 */
const useIsomorphicLayoutEffect =
  typeof document === 'undefined' ? useEffect : useLayoutEffect;

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
  // inline callback. Synced in an effect, not in the render body (a
  // render-time ref write is a React Compiler violation) — and declared ahead
  // of every effect that reads it, so React's in-order effect flush keeps the
  // ref current for the same commit.
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  });

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
  //
  // Done DURING RENDER, via React's documented "adjusting state when a prop
  // changes" pattern, rather than in an effect. React throws the in-progress
  // render away and re-runs this function with the reset values before
  // committing anything, so no commit ever carries a new log against the
  // previous log's clock. An effect could only reset AFTER such a commit, and
  // the effects that key on the clock (the `onEvent` walk below in
  // particular) would have already run once against that mismatched pair.
  // Deliberately keyed on `source` identity ALONE, not `[source, bounds,
  // replayAutoplay]` (the prior effect's dependency array): `bounds` derives
  // from `source` via `sortedEvents`, so tracking it separately was inert, and
  // toggling the `autoplay` prop on an otherwise-stable source must not yank
  // the scrub position back to the start — #106 removed exactly that coupling
  // as a latent bug, and this render-time rewrite keeps its narrowing.
  const [replayResetKey, setReplayResetKey] = useState(source);
  // True only in the render pass that discovers the change: the reset below is
  // queued but the local `replayClock`/`replayStatus` still hold the previous
  // log's values, so anything downstream that reads them has to wait for the
  // re-run rather than decide on a pair that will never be committed.
  const replayResetPending = replayResetKey !== source;

  if (replayResetPending) {
    setReplayResetKey(source);
    if (source.kind === 'replay') {
      setReplayClock(bounds?.start ?? 0);
      setReplayStatus(replayAutoplay ? 'playing' : 'paused');
    }
  }

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

  // Flip to 'complete' exactly once the clock reaches the end. Also a
  // render-time adjustment, and it stays a STATE flip rather than becoming a
  // derived `replayClock >= bounds.end` — completion is sticky in a way the
  // clock is not. `seekTo` deliberately leaves a backward seek from the end
  // paused; derived, that seek would silently resume playing.
  //
  // Self-terminating: the re-run this schedules sees `'complete'` and stops.
  // Skipped while a reset is pending, so the end-of-log test is never applied
  // to the previous log's clock.
  if (
    !replayResetPending &&
    mode === 'replay' &&
    bounds &&
    replayClock >= bounds.end &&
    replayStatus === 'playing'
  ) {
    setReplayStatus('complete');
  }

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
  // Live events accumulate in an append-only buffer (see appendOnlyBuffer.ts).
  // The buffer's array grows IN PLACE: re-creating it per flush
  // (`setLiveEvents(previous => [...previous, ...batch])`) re-copied EVERY
  // accumulated event on EVERY flush — O(all events so far), forever. A
  // long-running feed accumulates hundreds of thousands of events with a batch
  // arriving every few seconds, so that per-flush re-copy grows without bound
  // and dominates the tab's allocation profile as sustained GC pressure.
  // In-place growth makes a flush O(batch).
  //
  // What goes into state is NOT that growing array but an O(1) immutable
  // snapshot of it, taken after each append. That keeps the append cheap while
  // still giving `events` the property every React memoization is keyed on:
  // identity changes exactly when the contents change.
  //
  // An earlier version put the growing array in a one-field wrapper and asked
  // consumers never to memoize on its identity. That rule could not be kept —
  // the React Compiler infers exactly that dependency on a consumer's behalf,
  // so a compiled `useMemo(() => summarize(events), [events])` froze at its
  // first value while the feed ran on. See usePlayback.memo.test.ts.
  //
  // The snapshot is the state, so nothing reads the ref during render (a React
  // Compiler violation); the ref holds the buffer purely for the mutation
  // sites, all of which run outside render.
  const liveEventsRef = useRef<AppendOnlyBuffer<PlaybackEvent<TPayload>>>(
    createAppendOnlyBuffer<PlaybackEvent<TPayload>>(),
  );
  const [liveEvents, setLiveEvents] =
    useState<PlaybackEvent<TPayload>[]>(EMPTY_LIVE_EVENTS);
  const [liveClock, setLiveClock] = useState<number>(() => Date.now());
  const [liveStatus, setLiveStatus] = useState<PlaybackStatus>(
    liveAutoplay ? 'connecting' : 'paused',
  );
  const livePlayingRef = useRef(liveAutoplay);
  const liveBufferRef = useRef<PlaybackEvent<TPayload>[]>([]);

  // Switching sources resets five things — two states, three refs — and the
  // reset only holds together if NOTHING from the outgoing source can be
  // observed between them. It is spread over three phases to keep that true,
  // and each phase is where it is for a reason.
  //
  // RENDER: the two states. React re-runs this function with the reset values
  // before committing, so no commit shows the new source carrying the previous
  // source's events.
  const [liveResetKey, setLiveResetKey] = useState({ source, liveAutoplay });

  if (
    liveResetKey.source !== source ||
    liveResetKey.liveAutoplay !== liveAutoplay
  ) {
    setLiveResetKey({ source, liveAutoplay });
    if (source.kind === 'live') {
      setLiveEvents(EMPTY_LIVE_EVENTS);
      setLiveStatus(liveAutoplay ? 'connecting' : 'paused');
    }
  }

  // COMMIT, SYNCHRONOUSLY: the three refs.
  //
  // This has to be `useLayoutEffect`. Downgrading it to `useEffect` reopens a
  // window and reintroduces a bug: the outgoing subscription stays live until
  // its cleanup, which runs in the PASSIVE phase, and passive effects are
  // flushed on a scheduler task that a `requestAnimationFrame` can beat. In
  // that window the outgoing batcher can still flush. Once the state reset
  // above has already committed, that flush has nothing left to erase it, so
  // the previous source's events land in — and stay in — the new source's
  // list. Resetting the refs in the layout phase closes the window: the refs
  // are already swapped before anything outside React can run, which is what
  // lets the subscription below recognise itself as superseded.
  useIsomorphicLayoutEffect(() => {
    if (source.kind !== 'live') return;
    livePlayingRef.current = liveAutoplay;
    liveBufferRef.current = [];
    liveEventsRef.current = createAppendOnlyBuffer<PlaybackEvent<TPayload>>();
  }, [source, liveAutoplay]);

  // PASSIVE: the subscription itself, which is the only part that may run late.
  useEffect(() => {
    if (source.kind !== 'live') return;

    // The buffer the layout effect installed for THIS source. Captured rather
    // than read through the ref at flush time, so that a callback belonging to
    // a superseded subscription can tell: if the ref no longer points at the
    // buffer this closure was built around, a newer source has taken over and
    // whatever arrived here belongs to the old one. Dropping it is the whole
    // guarantee — it is what the state reset used to provide by erasing the
    // result afterwards, done before the fact instead.
    const buffer = liveEventsRef.current;
    const isCurrent = () => liveEventsRef.current === buffer;

    // A frame's worth of arriving events collapse into ONE in-place append +
    // ONE snapshot instead of one state commit per event — see rafBatch.ts.
    // `onEvent` still fires per event, in arrival order, on flush: batching
    // the state *commit* is the optimization, not the event contract a
    // consumer observes.
    const batcher = createRafBatcher<PlaybackEvent<TPayload>>((batch) => {
      if (!isCurrent()) return;
      buffer.append(batch);
      setLiveEvents(buffer.snapshot());
      const last = batch[batch.length - 1];
      if (last) setLiveClock(last.timestamp);
      for (const event of batch) onEventRef.current?.(event);
      setLiveStatus((current) =>
        current === 'connecting' ? 'connected' : current,
      );
    });

    const unsubscribeEvents = source.subscribe((event) => {
      if (!isCurrent()) return;
      if (!livePlayingRef.current) {
        liveBufferRef.current.push(event);
        return;
      }
      batcher.push(event);
    });

    const unsubscribeStatus = source.subscribeStatus?.((status) => {
      if (!isCurrent()) return;
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
    // oxlint-disable-next-line react/exhaustive-deps -- `liveAutoplay` is a deliberate trigger-only dep: the layout effect above swaps the buffers on the same key, so this subscription must be rebuilt in lockstep or its flushes would all be dropped as superseded.
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
      // Appended in place for the same two reasons as the flush: no
      // O(all-events) re-copy, and a long pause can buffer a backlog past the
      // engine's max argument count.
      liveEventsRef.current.append(buffered);
      setLiveEvents(liveEventsRef.current.snapshot());
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

  // Read out of state, not out of the ref: every mutation site above pairs its
  // in-place append with a fresh snapshot, so a render always follows a
  // mutation and sees the events as of that commit — without touching a ref
  // during render, and without the snapshot shifting under a render already in
  // flight.
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
