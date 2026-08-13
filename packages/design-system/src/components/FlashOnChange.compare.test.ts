import { describe, expect, it } from 'vitest';

import { flashDirection } from './FlashOnChange.js';

// The `parse` option resolves the false-flash on fixed-scale decimal strings:
// `flashDirection` compares by number, so a `parse` that maps decimal strings to
// their numeric magnitude makes trailing-zero changes read as "no change".
describe('flashDirection with a decimal parse', () => {
  const parse = (v: string) => Number(v);

  it('does not flash when only trailing zeros change', () => {
    expect(flashDirection(parse('100.100'), parse('100.10'))).toBe('none');
  });

  it('flashes up/down on a real magnitude change', () => {
    expect(flashDirection(parse('100.20'), parse('100.10'))).toBe('up');
    expect(flashDirection(parse('100.00'), parse('100.10'))).toBe('down');
  });
});
