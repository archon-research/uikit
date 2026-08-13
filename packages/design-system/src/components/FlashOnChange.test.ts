import { describe, expect, it } from 'vitest';

import { flashDirection } from './FlashOnChange.js';

// `flashDirection` is the pure change-direction mapping behind `useValueFlash`.
describe('flashDirection', () => {
  it('reports up and down for numeric changes', () => {
    expect(flashDirection(2, 1)).toBe('up');
    expect(flashDirection(1, 2)).toBe('down');
  });

  it('reports none for an equal value', () => {
    expect(flashDirection(5, 5)).toBe('none');
  });

  it('parses numeric strings', () => {
    expect(flashDirection('10', '9')).toBe('up');
    expect(flashDirection('9', '10')).toBe('down');
  });

  it('reports none when either side is non-numeric', () => {
    expect(flashDirection('n/a', 1)).toBe('none');
    expect(flashDirection(1, undefined)).toBe('none');
  });
});
