import { describe, expect, it } from 'vitest';

import { resolveHotkeyAction } from './useTransportHotkeys.js';

// `resolveHotkeyAction` is the pure decision core behind `useTransportHotkeys`
// — no `window`/`KeyboardEvent` dependency, so it's testable directly with
// plain event-shaped objects, the same way `getCellFlashState` is tested for
// `DataTable`.

describe('resolveHotkeyAction', () => {
  it('resolves Space to play when the controller is not active', () => {
    expect(
      resolveHotkeyAction(
        { key: ' ', code: 'Space' },
        { mode: 'replay', isActive: false },
      ),
    ).toEqual({ kind: 'play' });
  });

  it('resolves Space to pause when the controller is active', () => {
    expect(
      resolveHotkeyAction(
        { key: ' ', code: 'Space' },
        { mode: 'replay', isActive: true },
      ),
    ).toEqual({ kind: 'pause' });
  });

  it('resolves Space for a live source using isActive, not a replay-only status', () => {
    // Live sources never report status "playing" (see usePlayback) — the
    // caller resolves isActive from "connected"/"connecting" itself, and
    // this resolver just trusts that boolean regardless of mode.
    expect(
      resolveHotkeyAction({ key: ' ' }, { mode: 'live', isActive: true }),
    ).toEqual({ kind: 'pause' });
    expect(
      resolveHotkeyAction({ key: ' ' }, { mode: 'live', isActive: false }),
    ).toEqual({ kind: 'play' });
  });

  it('resolves , and . to step backward/forward during replay', () => {
    expect(
      resolveHotkeyAction({ key: ',' }, { mode: 'replay', isActive: true }),
    ).toEqual({ kind: 'step', direction: 'backward' });
    expect(
      resolveHotkeyAction({ key: '.' }, { mode: 'replay', isActive: true }),
    ).toEqual({ kind: 'step', direction: 'forward' });
  });

  it('resolves 1/2/4/8 to a speed change during replay', () => {
    expect(
      resolveHotkeyAction({ key: '4' }, { mode: 'replay', isActive: true }),
    ).toEqual({ kind: 'speed', speed: 4 });
  });

  it('ignores step/speed keys for a live source — arrival rate is not scrubbable', () => {
    expect(
      resolveHotkeyAction({ key: ',' }, { mode: 'live', isActive: true }),
    ).toBeNull();
    expect(
      resolveHotkeyAction({ key: '2' }, { mode: 'live', isActive: true }),
    ).toBeNull();
  });

  it('ignores keys outside the bound set', () => {
    expect(
      resolveHotkeyAction({ key: 'k' }, { mode: 'replay', isActive: true }),
    ).toBeNull();
    expect(
      resolveHotkeyAction({ key: '9' }, { mode: 'replay', isActive: true }),
    ).toBeNull();
  });

  it('ignores the keystroke while a modifier is held', () => {
    expect(
      resolveHotkeyAction(
        { key: ' ', metaKey: true },
        { mode: 'replay', isActive: false },
      ),
    ).toBeNull();
    expect(
      resolveHotkeyAction(
        { key: ',', ctrlKey: true },
        { mode: 'replay', isActive: true },
      ),
    ).toBeNull();
    expect(
      resolveHotkeyAction(
        { key: '1', altKey: true },
        { mode: 'replay', isActive: true },
      ),
    ).toBeNull();
  });

  it('ignores the keystroke when it targets an editable element', () => {
    expect(
      resolveHotkeyAction(
        { key: ' ', target: { tagName: 'INPUT' } as unknown as EventTarget },
        { mode: 'replay', isActive: false },
      ),
    ).toBeNull();
    expect(
      resolveHotkeyAction(
        {
          key: ' ',
          target: { tagName: 'TEXTAREA' } as unknown as EventTarget,
        },
        { mode: 'replay', isActive: false },
      ),
    ).toBeNull();
    expect(
      resolveHotkeyAction(
        {
          key: ' ',
          target: { tagName: 'SELECT' } as unknown as EventTarget,
        },
        { mode: 'replay', isActive: false },
      ),
    ).toBeNull();
    expect(
      resolveHotkeyAction(
        {
          key: ' ',
          target: {
            tagName: 'DIV',
            isContentEditable: true,
          } as unknown as EventTarget,
        },
        { mode: 'replay', isActive: false },
      ),
    ).toBeNull();
  });

  it('does not treat a plain non-editable element as editable', () => {
    expect(
      resolveHotkeyAction(
        { key: ' ', target: { tagName: 'DIV' } as unknown as EventTarget },
        { mode: 'replay', isActive: false },
      ),
    ).toEqual({ kind: 'play' });
  });
});
