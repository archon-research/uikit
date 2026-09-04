/**
 * @vitest-environment jsdom
 *
 * `resolveHotkeyAction` (tested next door) decides WHICH action a keystroke
 * maps to. This suite covers the other half: that the single `keydown`
 * listener always dispatches against the LATEST controller, even though it is
 * installed once and never re-bound as playback state ticks over.
 */
import { act, cleanup, renderHook } from '@testing-library/react';
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

function pressKey(key: string): void {
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );
  });
}

describe('useTransportHotkeys', () => {
  afterEach(cleanup);

  it('drives the controller it was given', () => {
    const controller = makeController();
    renderHook(() => useTransportHotkeys(controller));

    pressKey(' ');
    expect(controller.play).toHaveBeenCalledTimes(1);
  });

  it('dispatches against the LATEST controller after a re-render', () => {
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

  it('reports the action to the LATEST onAction after a re-render', () => {
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
