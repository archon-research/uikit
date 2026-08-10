import { describe, expect, it } from 'vitest';

import { deriveLeftMargin } from './responsive.js';

// `deriveLeftMargin` is the pure label -> gutter mapping behind the responsive
// axis helper — the fix for a constant margin that fits `$108.6k` but clips
// `$500.0M`.
describe('deriveLeftMargin', () => {
  it('returns the floor when labels are short', () => {
    expect(deriveLeftMargin(['1', '2'], { floor: 48 })).toBe(48);
  });

  it('grows the gutter for a longer label', () => {
    const short = deriveLeftMargin(['$500.0M']); // 7 chars
    const long = deriveLeftMargin(['$1,234,567.00']); // 13 chars
    expect(long).toBeGreaterThan(short);
  });

  it('sizes from the widest label, not the last', () => {
    expect(deriveLeftMargin(['$1,234,567.00', '1'])).toBe(
      deriveLeftMargin(['$1,234,567.00']),
    );
  });

  it('tolerates null/undefined entries and sizes from the present label', () => {
    // floor 10 is below the computed gutter for '1' (ceil(7.6)+16 = 24), so the
    // content wins; the nullish entries are simply skipped.
    expect(deriveLeftMargin([null, undefined, '1'], { floor: 10 })).toBe(24);
  });
});
