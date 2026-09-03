import { useMemo } from 'react';

/**
 * Number of `colors.identity.*` slots defined in the preset. The palette is an
 * *identity* palette (a stable color per entity id), distinct from the role
 * ramp (`chart.series.*`) — an instrument's color stays the same across a bar,
 * a line, and a legend whatever role it plays.
 */
export const IDENTITY_SLOT_COUNT = 8;

/** FNV-1a hash (32-bit), used to place an id into a slot deterministically. */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Assign each id a stable identity color, returned as a CSS `var(...)` string so
 * SVG attributes and CSS both honour the theme (and dark mode). Ids are
 * de-duplicated and assigned in sorted order for determinism; on a hash
 * collision the next free slot is probed forward. With more distinct ids than
 * slots, slots are reused (the palette is finite by design).
 *
 * `count` is clamped to {@link IDENTITY_SLOT_COUNT} — only that many
 * `--colors-identity-N` tokens exist in the preset, so a larger `count` would
 * otherwise emit a `var(--colors-identity-N)` reference beyond what's defined
 * (which resolves to nothing).
 *
 * Pure and exported for testing; {@link useIdentityPalette} is the memoized hook
 * wrapper.
 */
export function identityPalette(
  ids: string[],
  count = IDENTITY_SLOT_COUNT,
): Record<string, string> {
  const slotCount = Math.min(count, IDENTITY_SLOT_COUNT);
  const unique = [...new Set(ids)].sort();
  const used = new Array<boolean>(slotCount).fill(false);
  const map: Record<string, string> = {};
  for (const id of unique) {
    let slot = fnv1a(id) % slotCount;
    let probes = 0;
    while (used[slot] && probes < slotCount) {
      slot = (slot + 1) % slotCount;
      probes++;
    }
    if (probes < slotCount) used[slot] = true;
    map[id] = `var(--colors-identity-${slot + 1})`;
  }
  return map;
}

/**
 * Stable per-id identity colors. Returns a map of id → `var(--colors-identity-N)`.
 * The result is memoized on the id set, so it's safe to derive series colors
 * from it on every render.
 *
 * Each value is a raw CSS `var(...)` string, which is directly usable anywhere
 * `@archon-research/charting` accepts a `ChartColor` — that type's escape hatch
 * covers exactly this case, a color chosen at runtime rather than named in
 * source. A static color should be named by token instead
 * (`color="identity.3"`), so a typo is a compile error.
 */
export function useIdentityPalette(
  ids: string[],
  count = IDENTITY_SLOT_COUNT,
): Record<string, string> {
  // `JSON.stringify` is a collision-proof, plain-text way to fold `count` +
  // `ids` into one memo key — a delimiter-joined string risks collisions (and
  // previously used literal NUL-byte delimiters, which made this file look
  // binary to `git diff`).
  const key = JSON.stringify([count, ids]);
  // The memo body reads `count`/`ids` back OUT of `key` rather than closing
  // over them, so `[key]` is a complete dependency list rather than a
  // suppressed one — a lint suppression here also opts the whole hook out of
  // React Compiler optimization.
  return useMemo(() => {
    const [memoCount, memoIds] = JSON.parse(key) as [number, string[]];
    return identityPalette(memoIds, memoCount);
  }, [key]);
}
