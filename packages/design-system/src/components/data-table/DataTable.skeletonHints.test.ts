import { describe, expect, it } from 'vitest';

import { type SkeletonColumnHint } from '../SkeletonRows.js';
import { resolveSkeletonColumnHints } from './DataTable.js';

// `resolveSkeletonColumnHints` is the pure decision behind what `DataTable`
// hands `SkeletonRows` as `columnHints`. It matters because hints-*present* is
// the flag that switches `SkeletonRows` into detailed mode, so every "keep the
// plain uniform skeleton" path has to come back as `undefined` rather than an
// empty array.

const derivedWithNumeric: readonly SkeletonColumnHint[] = [
  { kind: 'text' },
  { kind: 'numeric' },
  { kind: 'text' },
];

const derivedAllText: readonly SkeletonColumnHint[] = [
  { kind: 'text' },
  { kind: 'text' },
];

describe('resolveSkeletonColumnHints', () => {
  it('uses explicit non-empty hints as-is, ignoring what was derived', () => {
    const explicit: readonly SkeletonColumnHint[] = [
      { kind: 'identity' },
      { kind: 'numeric', widthPercent: 40 },
    ];
    expect(resolveSkeletonColumnHints(explicit, derivedWithNumeric)).toBe(
      explicit,
    );
  });

  it('treats an explicit empty array as the documented opt-out', () => {
    // Not `[]` — an empty array would put SkeletonRows in detailed mode with
    // nothing hinted, the exact opposite of the documented behavior.
    expect(resolveSkeletonColumnHints([], derivedWithNumeric)).toBeUndefined();
  });

  it('opts out even when derivation found something worth applying', () => {
    // Same input as the case above, stated as its own property: the explicit
    // opt-out must win over an interesting derivation, not merely over an
    // empty one.
    expect(
      resolveSkeletonColumnHints([], [{ kind: 'numeric', widthPercent: 55 }]),
    ).toBeUndefined();
  });

  it('falls back to derived hints when at least one column is numeric', () => {
    expect(resolveSkeletonColumnHints(undefined, derivedWithNumeric)).toBe(
      derivedWithNumeric,
    );
  });

  it('discards all-text derived hints so an unannotated table stays plain', () => {
    expect(
      resolveSkeletonColumnHints(undefined, derivedAllText),
    ).toBeUndefined();
  });

  it('discards derived hints that are only text with a custom width', () => {
    // The leading expander/selection cells derive as `text` at 40% — a table
    // with those but no numeric column must still come back plain.
    expect(
      resolveSkeletonColumnHints(undefined, [
        { kind: 'text', widthPercent: 40 },
        { kind: 'text' },
      ]),
    ).toBeUndefined();
  });

  it('discards an empty derivation (a table with no visible columns)', () => {
    expect(resolveSkeletonColumnHints(undefined, [])).toBeUndefined();
  });
});
