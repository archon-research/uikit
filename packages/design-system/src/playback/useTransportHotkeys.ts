/**
 * Cross-tool transport hotkeys for `usePlayback`: play/pause/step/speed
 * bound directly to the same controller `PlaybackBar` drives — no second
 * state path, just a consumer-side key listener over `UsePlaybackResult`.
 *
 *   Space      play / pause
 *   , / .      step backward / forward   (the universal frame-step pair)
 *   1 2 4 8    speed multiplier
 *
 * Bind it once per dashboard, against the same `usePlayback` result the
 * `PlaybackBar` reads from.
 */

import { useEffect, useRef } from 'react';

import type { PlaybackMode, UsePlaybackResult } from './usePlayback.js';

export type TransportHotkeyAction =
  | { kind: 'play' }
  | { kind: 'pause' }
  | { kind: 'step'; direction: 'forward' | 'backward' }
  | { kind: 'speed'; speed: number };

export const TRANSPORT_HOTKEYS: Array<{ keys: string; does: string }> = [
  { keys: 'Space', does: 'play / pause' },
  { keys: ', .', does: 'step back / forward' },
  { keys: '1 2 4 8', does: 'replay speed' },
];

const SPEEDS = new Set(['1', '2', '4', '8']);

/**
 * True when the keystroke belongs to whatever the user is typing in — a text
 * field, a select, a `contenteditable`. Space in a search box must insert a
 * space, not toggle playback. Duck-typed (no `instanceof HTMLElement`) so it
 * has no DOM-global dependency: it works the same for a real event target, a
 * cross-realm element (e.g. from an iframe, where `instanceof` against the
 * host window's `HTMLElement` class famously fails), or a plain object in a
 * test.
 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (target == null || typeof target !== 'object') return false;
  const element = target as { isContentEditable?: boolean; tagName?: string };
  if (element.isContentEditable) return true;
  return (
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.tagName === 'SELECT'
  );
}

/** The minimal shape `resolveHotkeyAction` needs from a `KeyboardEvent`. */
type HotkeyEventLike = {
  key: string;
  code?: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  target?: EventTarget | null;
};

/** The minimal, DOM-independent snapshot of the controller `resolveHotkeyAction` needs. */
export type TransportHotkeySnapshot = {
  mode: PlaybackMode;
  /**
   * Whether the controller is currently advancing. Replay's own `'playing'`
   * status; for a live source, `usePlayback` never sets `status: 'playing'`
   * — `'connected'`/`'connecting'` are its "following" states — so the
   * caller resolves this from whichever status shape it's driving rather
   * than this module assuming one status enum's exact values.
   */
  isActive: boolean;
};

/**
 * Pure key → action resolver, decoupled from `window`/`KeyboardEvent` so it
 * is testable without a DOM: given an event-shaped object and a minimal
 * controller snapshot, returns the action that keystroke should trigger (or
 * `null` if it's not a transport hotkey, is aimed at an editable field, or a
 * modifier is held). The `useTransportHotkeys` effect below is a thin DOM
 * wrapper around this — it owns no decision logic itself.
 */
export function resolveHotkeyAction(
  event: HotkeyEventLike,
  snapshot: TransportHotkeySnapshot,
): TransportHotkeyAction | null {
  if (event.metaKey || event.ctrlKey || event.altKey) return null;
  if (isEditableTarget(event.target ?? null)) return null;

  if (event.code === 'Space' || event.key === ' ') {
    return snapshot.isActive ? { kind: 'pause' } : { kind: 'play' };
  }

  // Stepping and speed are replay-only — a live feed's arrival rate isn't
  // ours to scrub (see `usePlayback`'s own note on live sources).
  if (snapshot.mode !== 'replay') return null;

  if (event.key === ',' || event.key === '.') {
    return {
      kind: 'step',
      direction: event.key === ',' ? 'backward' : 'forward',
    };
  }

  if (SPEEDS.has(event.key)) {
    return { kind: 'speed', speed: Number(event.key) };
  }

  return null;
}

export type UseTransportHotkeysOptions = {
  /** Turn the bindings off (e.g. while a modal owns the keyboard). */
  enabled?: boolean;
  /** Called after a hotkey fires — used for e.g. an on-screen "last action" hint. */
  onAction?: (action: TransportHotkeyAction) => void;
};

/**
 * Binds the transport hotkeys to a `usePlayback` result. Generic over the
 * controller's payload type, same as `usePlayback` itself — this has no
 * opinion on what's flowing through the log, only on play/pause/step/speed.
 */
export function useTransportHotkeys<TPayload = unknown>(
  playback: UsePlaybackResult<TPayload>,
  { enabled = true, onAction }: UseTransportHotkeysOptions = {},
): void {
  // Keep the latest controller/callback in refs so the listener is installed
  // exactly once and never churns as playback state ticks over.
  const playbackRef = useRef(playback);
  playbackRef.current = playback;
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const current = playbackRef.current;
      const isActive =
        current.mode === 'replay'
          ? current.status === 'playing'
          : current.status === 'connected' || current.status === 'connecting';

      const action = resolveHotkeyAction(event, {
        mode: current.mode,
        isActive,
      });
      if (!action) return;

      event.preventDefault();
      switch (action.kind) {
        case 'play':
          current.play();
          break;
        case 'pause':
          current.pause();
          break;
        case 'step':
          current.step(action.direction);
          break;
        case 'speed':
          current.setSpeed(action.speed);
          break;
      }
      onActionRef.current?.(action);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
