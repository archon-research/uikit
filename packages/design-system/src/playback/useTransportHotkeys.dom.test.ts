import { act, cleanup, renderHook } from '@testing-library/react';
/**
 * @vitest-environment jsdom
 *
 * `resolveHotkeyAction` (tested next door) decides WHICH action a keystroke
 * maps to. This suite covers the two things the pure resolver cannot: that the
 * single `keydown` listener reads through to the latest controller without
 * being re-bound, and that a matched key is `preventDefault`ed.
 */
import { useLayoutEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { UsePlaybackResult } from './usePlayback.js';
import { useTransportHotkeys } from './useTransportHotkeys.js';

function makeController(
  overrides: Partial<UsePlaybackResult> = {},
): UsePlaybackResult {
  return {
    mode: 'replay',
    status: 'paused',
    clock: 0,
    bounds: { start: 0, end: 10 },
    speed: 1,
    events: [],
    latestEvent: null,
    play: vi.fn(),
    pause: vi.fn(),
    setSpeed: vi.fn(),
    seekTo: vi.fn(),
    step: vi.fn(),
    ...overrides,
  };
}

function pressKey(key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
}

/**
 * Fires a `keydown` from inside the COMMIT phase, i.e. after the render it
 * belongs to has committed but before any passive effect for that commit has
 * run. That is the window a real browser keydown can land in — the hook's
 * listener is on `window`, so an event whose target is outside the React root
 * never enters React's dispatch and nothing forces a passive flush first.
 */
function useCommitPhaseKeypress(key: string | null): void {
  useLayoutEffect(() => {
    if (key == null) return;
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  }, [key]);
}

describe('useTransportHotkeys', () => {
  afterEach(cleanup);

  it('drives the controller it was given', () => {
    const controller = makeController();
    renderHook(() => useTransportHotkeys(controller));

    pressKey(' ');
    expect(controller.play).toHaveBeenCalledTimes(1);
  });

  it('reads through to the latest controller without re-binding the listener', () => {
    const first = makeController();
    const { rerender } = renderHook(
      ({ playback }) => useTransportHotkeys(playback),
      { initialProps: { playback: first } },
    );

    // A new controller object every render is the normal case — `usePlayback`
    // returns a fresh one as its clock ticks.
    const second = makeController();
    rerender({ playback: second });

    pressKey(' ');
    expect(first.play).not.toHaveBeenCalled();
    expect(second.play).toHaveBeenCalledTimes(1);
  });

  it('reads through to the latest onAction without re-binding the listener', () => {
    const controller = makeController();
    const first = vi.fn();
    const { rerender } = renderHook(
      ({ onAction }) => useTransportHotkeys(controller, { onAction }),
      { initialProps: { onAction: first } },
    );

    const second = vi.fn();
    rerender({ onAction: second });

    pressKey(' ');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith({ kind: 'play' });
  });

  it('sees the controller from the commit a keystroke lands in', () => {
    const first = makeController();
    const second = makeController();
    const { rerender } = renderHook(
      ({
        playback,
        fireKey,
      }: {
        playback: UsePlaybackResult;
        fireKey: string | null;
      }) => {
        useTransportHotkeys(playback);
        useCommitPhaseKeypress(fireKey);
      },
      { initialProps: { playback: first, fireKey: null as string | null } },
    );

    rerender({ playback: second, fireKey: ' ' });

    // Fails if the refs are synced in a PASSIVE effect: that effect has not
    // run yet at the moment this keydown is dispatched.
    expect(first.play).not.toHaveBeenCalled();
    expect(second.play).toHaveBeenCalledTimes(1);
  });

  it('preventDefaults a matched key and leaves an unmatched one alone', () => {
    const controller = makeController();
    const { rerender } = renderHook(
      ({ enabled }) => useTransportHotkeys(controller, { enabled }),
      { initialProps: { enabled: true } },
    );

    // Space scrolls the page by default — swallowing it is the whole reason
    // the operator can hold a dashboard still while toggling playback.
    expect(pressKey(' ').defaultPrevented).toBe(true);
    expect(pressKey('x').defaultPrevented).toBe(false);

    rerender({ enabled: false });
    expect(pressKey(' ').defaultPrevented).toBe(false);
  });

  it('stops listening once disabled, and again once unmounted', () => {
    const controller = makeController();
    const { rerender, unmount } = renderHook(
      ({ enabled }) => useTransportHotkeys(controller, { enabled }),
      { initialProps: { enabled: true } },
    );

    pressKey(' ');
    expect(controller.play).toHaveBeenCalledTimes(1);

    rerender({ enabled: false });
    pressKey(' ');
    expect(controller.play).toHaveBeenCalledTimes(1);

    rerender({ enabled: true });
    pressKey(' ');
    expect(controller.play).toHaveBeenCalledTimes(2);

    unmount();
    pressKey(' ');
    expect(controller.play).toHaveBeenCalledTimes(2);
  });
});
