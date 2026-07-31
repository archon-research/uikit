/**
 * A log-driven playback controller for live vs. replayed event streams:
 * "one view, two modes".
 *
 * `usePlayback` drives one virtual clock over a transport-agnostic
 * `PlaybackSource` (a live push feed or a static replayed append-only log),
 * and `PlaybackBar` (in `../components/PlaybackBar.js`, exported from the
 * package root alongside `Indicator`/`Button`) is the transport-bar
 * primitive. A consumer wires the hook's output straight into the bar and
 * into its own display — it never branches on `mode` itself.
 *
 * The mechanism — a virtual clock over an append-only log, transport-agnostic
 * between live and replay — is domain-neutral: any consumer with a
 * log-shaped activity stream (audit trails, deployment timelines, incident
 * replays) wants the same play/pause/speed/seek/step primitive. It composes
 * cleanly with existing primitives (`Indicator` for status, `Button` for
 * transport controls, the `panel`/`sectionHeading` recipes for chrome) rather
 * than introducing a parallel styling system, and its public API
 * (`component`/`type`/`payload`) is generic log-event vocabulary, not tied to
 * any one source's shape.
 *
 * What stays consumer-owned: the actual *source* implementations (a
 * WebSocket-backed live source for a given feed, a fetcher that turns a
 * JSONL blob into a sorted `PlaybackEvent[]`) and any cross-component
 * synchronization (multiple panels sharing one playback clock so a scrub in
 * one moves them all). Today each `usePlayback` instance owns its own clock;
 * a shared "playback context" that multiple panels subscribe to (one clock
 * driving several `PlaybackBar`-less displays, with a single bar as the
 * control surface) is a natural next step once more than one display needs
 * to move in lockstep.
 */
export {
  usePlayback,
  type PlaybackMode,
  type PlaybackStatus,
  type StepDirection,
  type UsePlaybackOptions,
  type UsePlaybackResult,
} from './usePlayback.js';
export {
  createLiveSource,
  createReplaySource,
  type LivePlaybackSource,
  type PlaybackBounds,
  type PlaybackEvent,
  type PlaybackSource,
  type PlaybackSourceStatus,
  type ReplayPlaybackSource,
} from './types.js';
