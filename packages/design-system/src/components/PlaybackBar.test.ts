import type { SyntheticEvent } from 'react';
import { describe, expect, it } from 'vitest';

import { markOffsetPercent, type PlaybackBarProps } from './PlaybackBar.js';

// `markOffsetPercent` is the pure placement core behind `PlaybackBar`'s
// `marks` row — testable directly with plain bounds objects, the same way
// `resolveHotkeyAction` is tested for `useTransportHotkeys`. It's
// domain-agnostic: the same math places timestamp marks and ordinal-index
// marks.

describe('markOffsetPercent', () => {
  it('interpolates a value across the bounds span', () => {
    expect(markOffsetPercent(50, { start: 0, end: 100 })).toBe(50);
    expect(markOffsetPercent(25, { start: 0, end: 100 })).toBe(25);
  });

  it('places ordinal indices without any timestamp scaling', () => {
    // A 12-day run keyed 0..11 — the ORB use case: index-space bounds, no
    // synthetic clock.
    expect(markOffsetPercent(0, { start: 0, end: 11 })).toBe(0);
    expect(markOffsetPercent(11, { start: 0, end: 11 })).toBe(100);
    expect(markOffsetPercent(5, { start: 0, end: 11 })).toBeCloseTo(45.4545, 3);
  });

  it('handles non-zero-based bounds (epoch-ms timestamps)', () => {
    const start = 1_755_000_000_000;
    const bounds = { start, end: start + 40_000 };
    expect(markOffsetPercent(start + 10_000, bounds)).toBe(25);
  });

  it('returns null without bounds', () => {
    expect(markOffsetPercent(5, null)).toBeNull();
    expect(markOffsetPercent(5, undefined)).toBeNull();
  });

  it('skips values outside the bounds', () => {
    expect(markOffsetPercent(-1, { start: 0, end: 10 })).toBeNull();
    expect(markOffsetPercent(11, { start: 0, end: 10 })).toBeNull();
  });

  it('places a zero-span bounds (single-event log) at 0%', () => {
    expect(markOffsetPercent(7, { start: 7, end: 7 })).toBe(0);
    expect(markOffsetPercent(8, { start: 7, end: 7 })).toBeNull();
  });
});

// `onPlay`/`onPause` shadow native media-event handlers on the props' base, so
// the base omits them (see `PlaybackBarProps`). Nothing at runtime depends on
// that omission, so only a type-check can catch its loss — and the check has to
// be a CALL, not an assignment: an event-taking handler is rejected whether or
// not the native handler is intersected in, so assignment cannot tell the two
// states apart. Arity at the call site can. This file is inside `type:check`'s
// program.
//
// The argument has to be a React `SyntheticEvent` specifically: a DOM `Event`
// is rejected on argument type in BOTH states, which would make the pin below
// pass either way and prove nothing.
declare const mediaEvent: SyntheticEvent<HTMLDivElement>;

// Never invoked; it exists to be compiled.
function pinsTransportCallbackArity(props: PlaybackBarProps) {
  props.onPlay();
  props.onPause();

  // @ts-expect-error Put the native `onPlay` back in the base and this line
  // compiles: the prop's type becomes the overload set
  // `ReactEventHandler<HTMLDivElement> & (() => void)`, whose first signature
  // takes exactly this event — an argument the consumer's zero-argument
  // callback never agreed to accept.
  props.onPlay(mediaEvent);
}

describe('PlaybackBar transport callback types', () => {
  it('types onPlay/onPause as zero-argument callbacks, not media event handlers', () => {
    expect(typeof pinsTransportCallbackArity).toBe('function');
  });
});
