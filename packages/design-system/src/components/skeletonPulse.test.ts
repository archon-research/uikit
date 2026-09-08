/**
 * Source scan, in the spirit of `panda-preset.test.ts`'s recursive recipe walk:
 * nothing at the type level can tell `background: SKELETON_FILL` from
 * `background: '#d4d4d4'` — both are just a string on a `CSSProperties` — so
 * reading the sources is the only thing that can hold the invariant.
 *
 * THE INVARIANT: every skeleton component paints its blocks from the one shared
 * {@link SKELETON_FILL} chain and never from a literal. That matters because the
 * blocks are *inline*-styled, which outranks any class a consumer could write:
 * a hardcoded colour here is not a default a consumer can override, it is the
 * final word (see the note on `SKELETON_FILL_VAR`). The rule was written down in
 * `skeletonPulse.ts` and enforced by nothing; a new `Skeleton*.tsx` that reached
 * for a hex would have shipped silently.
 */
import { globSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  SKELETON_FILL,
  SKELETON_PULSE_KEYFRAMES,
  SKELETON_PULSE_PEAK_OPACITY,
} from './skeletonPulse.js';

const COMPONENTS_DIR = dirname(fileURLToPath(import.meta.url));

/**
 * The skeleton components, picked up by shape rather than listed, so a future
 * `SkeletonFoo.tsx` is scanned the day it lands. Test files are excluded: a
 * `Skeleton*.test.tsx` would match the glob but is not shipped UI.
 */
const SKELETON_SOURCES = globSync('Skeleton*.tsx', { cwd: COMPONENTS_DIR })
  .filter((name) => !name.endsWith('.test.tsx'))
  .sort();

/**
 * The identifier a background must be spelled as. Not the resolved value —
 * these files import the constant, and pinning the reference is what keeps the
 * chain (and therefore the consumer override) the single source of truth.
 */
const ALLOWED_BACKGROUND = 'SKELETON_FILL';

/**
 * Any `background` / `backgroundColor` object key and the value it takes, up to
 * the end of the line. `backgroundColor` is listed first so the alternation
 * cannot match the `background` prefix inside it, and the required `:` keeps
 * longer property names (`borderBottomColor`) and prose out.
 */
const BACKGROUND_DECLARATION =
  /\b(backgroundColor|background)\s*:\s*([^,\n]+)/g;

/**
 * Comments are stripped before scanning so prose mentioning a colour cannot
 * fail the scan. Naive by design — it would also cut a `//` inside a string
 * literal, but no skeleton source has one, and the direction of that error is
 * safe here: these files' style values are quoted CSS, not URLs.
 */
function stripComments(source: string): string {
  return source
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/\/\/[^\n]*/g, '');
}

function backgroundValues(source: string): string[] {
  return [...stripComments(source).matchAll(BACKGROUND_DECLARATION)].map(
    (match) => (match[2] ?? '').trim().replace(/,$/, ''),
  );
}

describe('skeleton source scan', () => {
  // Guards the scan itself: a rename that emptied the glob would otherwise make
  // every assertion below vacuously pass.
  it('finds the skeleton components', () => {
    expect(SKELETON_SOURCES).toEqual(['SkeletonRows.tsx', 'SkeletonStack.tsx']);
  });

  it.each(SKELETON_SOURCES)(
    '%s paints every background from the shared fill constant',
    (name) => {
      const source = readFileSync(`${COMPONENTS_DIR}/${name}`, 'utf8');
      const values = backgroundValues(source);

      // Each of these files styles at least one block, so an empty result means
      // the regex stopped matching, not that the file got cleaner.
      expect(values.length).toBeGreaterThan(0);
      for (const value of values) {
        expect(value, `${name}: background: ${value}`).toBe(ALLOWED_BACKGROUND);
      }
    },
  );

  it('imports that constant rather than shadowing the name', () => {
    for (const name of SKELETON_SOURCES) {
      const source = readFileSync(`${COMPONENTS_DIR}/${name}`, 'utf8');
      expect(source, name).toContain(ALLOWED_BACKGROUND);
      expect(source, name).toMatch(
        /import\s+\{[\s\S]*?\bSKELETON_FILL\b[\s\S]*?\}\s+from\s+'\.\/skeletonPulse\.js'/,
      );
    }
  });
});

describe('skeleton fill chain', () => {
  // The literal tier is the only place a raw colour is allowed to live, and it
  // has to be theme-aware: it applies exactly when the design-system tokens
  // never reached the element, so there is no theme layer above it to correct a
  // light-only value. `SkeletonStack.test.ts` resolves both limbs.
  it('ends in a theme-aware literal, not a bare hex', () => {
    expect(SKELETON_FILL).toContain('light-dark(');
    // A bare hex outside `light-dark()` would be a light-only last resort.
    expect(SKELETON_FILL.replace(/light-dark\([^)]*\)/, '')).not.toMatch(
      /#[0-9a-f]{3,8}/i,
    );
  });

  // An animated skeleton must never be brighter than a static one, so the
  // keyframes' own peak has to be this constant rather than a second opinion.
  it('peaks the pulse at the resting opacity', () => {
    expect(SKELETON_PULSE_KEYFRAMES).toContain(
      `opacity: ${SKELETON_PULSE_PEAK_OPACITY}`,
    );
    expect(SKELETON_PULSE_PEAK_OPACITY).toBeLessThanOrEqual(1);
  });
});
