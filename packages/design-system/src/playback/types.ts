/**
 * Transport-agnostic playback types for a "live + replay, one view"
 * controller: any display should be able to render from either a real-time
 * stream or an accelerated replay of an append-only activity log, without the
 * consuming component knowing which one it's looking at.
 */

/**
 * A single append-only log entry. The replay engine reconstructs a display
 * **only** from a sequence of these (never from mutable state).
 *
 * Kept intentionally minimal: timestamp + component + payload. `seq` and
 * `type` are small, load-bearing additions (stable ordering when timestamps
 * tie, and a discriminant for the payload) rather than scope creep — most
 * real logs need at least these five fields.
 */
export type PlaybackEvent<TPayload = unknown> = {
  /** Monotonic sequence number in the source log; breaks timestamp ties and gives stable React keys. */
  seq: number;
  /** Epoch milliseconds this event occurred at in *source* time (log time for replay, arrival time for live). */
  timestamp: number;
  /** Which component/stream this event belongs to, e.g. "worker.a", "ingestion", "pipeline". */
  component: string;
  /** Event kind within that component/stream, e.g. "log", "state-change", "heartbeat". */
  type: string;
  /** Arbitrary event body; shape is owned by the producing component. */
  payload: TPayload;
};

export type PlaybackSourceStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'complete';

/**
 * A live, push-based source: events arrive whenever the transport delivers
 * them (WebSocket, SSE, polling — the hook doesn't care). Playback controls
 * (speed/seek/step) don't apply to a live feed's *arrival* rate; `usePlayback`
 * only lets you play/pause whether arrived events are surfaced to the
 * consumer.
 */
export type LivePlaybackSource<TPayload = unknown> = {
  kind: 'live';
  /** Register a listener for newly-arrived events. Returns an unsubscribe function. */
  subscribe(onEvent: (event: PlaybackEvent<TPayload>) => void): () => void;
  /** Optional connection-status stream, surfaced by `PlaybackBar`'s `Indicator`. */
  subscribeStatus?(
    onStatus: (status: PlaybackSourceStatus) => void,
  ): () => void;
};

/**
 * A replayed source: a static, time-sorted append-only log. Because the whole
 * log is known up front, `usePlayback` owns all playback mechanics itself
 * (virtual clock, speed multiplier, seek, event-stepping) — the source is
 * just data, not a live subscription.
 */
export type ReplayPlaybackSource<TPayload = unknown> = {
  kind: 'replay';
  /** Full append-only log. Need not be pre-sorted; `usePlayback` sorts by `timestamp` (then `seq`) once. */
  events: PlaybackEvent<TPayload>[];
};

export type PlaybackSource<TPayload = unknown> =
  | LivePlaybackSource<TPayload>
  | ReplayPlaybackSource<TPayload>;

/** Inclusive time bounds of a replay source, epoch ms. */
export type PlaybackBounds = {
  start: number;
  end: number;
};

/**
 * Convenience factory for a replay source from an in-memory (or
 * JSON.parse'd-JSONL) event array. Mostly sugar — `{ kind: 'replay', events }`
 * is equally valid — but keeps call sites in stories/consumers terse.
 */
export function createReplaySource<TPayload = unknown>(
  events: PlaybackEvent<TPayload>[],
): ReplayPlaybackSource<TPayload> {
  return { kind: 'replay', events };
}

/**
 * Convenience factory for a live source from a subscribe function (e.g. a
 * WebSocket message handler wired elsewhere). Mostly sugar, mirroring
 * `createReplaySource`.
 */
export function createLiveSource<TPayload = unknown>(
  subscribe: LivePlaybackSource<TPayload>['subscribe'],
  subscribeStatus?: LivePlaybackSource<TPayload>['subscribeStatus'],
): LivePlaybackSource<TPayload> {
  return { kind: 'live', subscribe, subscribeStatus };
}
