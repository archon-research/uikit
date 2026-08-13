import { describe, expect, it } from 'vitest';

import { IDENTITY_SLOT_COUNT, identityPalette } from './useIdentityPalette.js';

// `identityPalette` is the pure id -> stable-color-var mapping behind the hook.
describe('identityPalette', () => {
  it('assigns a colors.identity var to each id', () => {
    const map = identityPalette(['BTC-USD', 'ETH-USD']);
    for (const id of ['BTC-USD', 'ETH-USD']) {
      expect(map[id]).toMatch(/^var\(--colors-identity-[1-8]\)$/);
    }
  });

  it('is stable regardless of input order (assigned in sorted order)', () => {
    const a = identityPalette(['a', 'b', 'c']);
    const b = identityPalette(['c', 'a', 'b']);
    expect(b).toEqual(a);
  });

  it('de-duplicates ids', () => {
    const map = identityPalette(['x', 'x', 'x']);
    expect(Object.keys(map)).toEqual(['x']);
  });

  it('gives distinct slots to distinct ids until the palette is exhausted', () => {
    const ids = Array.from(
      { length: IDENTITY_SLOT_COUNT },
      (_, i) => `id-${i}`,
    );
    const slots = new Set(Object.values(identityPalette(ids)));
    // With the collision probe, N ids should occupy N distinct slots.
    expect(slots.size).toBe(IDENTITY_SLOT_COUNT);
  });

  it('reuses slots when there are more ids than slots (finite palette)', () => {
    const ids = Array.from(
      { length: IDENTITY_SLOT_COUNT + 3 },
      (_, i) => `id-${i}`,
    );
    const map = identityPalette(ids);
    expect(Object.keys(map)).toHaveLength(IDENTITY_SLOT_COUNT + 3);
    for (const value of Object.values(map)) {
      expect(value).toMatch(/^var\(--colors-identity-[1-8]\)$/);
    }
  });

  it('clamps a `count` above IDENTITY_SLOT_COUNT — only that many tokens exist', () => {
    const ids = Array.from(
      { length: IDENTITY_SLOT_COUNT + 2 },
      (_, i) => `id-${i}`,
    );
    // Without the clamp this would probe slots up to `count` (20) and could
    // emit `var(--colors-identity-9)` and beyond, which resolves to nothing.
    const map = identityPalette(ids, 20);
    for (const value of Object.values(map)) {
      expect(value).toMatch(/^var\(--colors-identity-[1-8]\)$/);
    }
  });

  it('matches the unclamped result once `count` exceeds IDENTITY_SLOT_COUNT', () => {
    const ids = ['a', 'b', 'c'];
    expect(identityPalette(ids, 20)).toEqual(identityPalette(ids));
  });
});
