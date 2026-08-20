import { describe, expect, it } from 'vitest';

import { stringifySearch } from './test-fixtures.js';
import {
  createSearchParamStripper,
  createValidatedSearchRedirect,
  rendersSameSearch,
} from './validated-search.js';

describe('rendersSameSearch', () => {
  it('compares as URL text, so a coerced number matches its string', () => {
    expect(rendersSameSearch({ rows: 25 }, { rows: '25' })).toBe(true);
    expect(rendersSameSearch({ on: true }, { on: 'true' })).toBe(true);
  });

  it('ignores key order, because a reordering renders the same data', () => {
    expect(rendersSameSearch({ b: '2', a: '1' }, { a: '1', b: '2' })).toBe(
      true,
    );
  });

  it('ignores applied keys the schema dropped', () => {
    expect(rendersSameSearch({ a: '1' }, { a: '1', b: undefined })).toBe(true);
  });

  it('rejects a raw key the schema did not keep', () => {
    expect(rendersSameSearch({ a: '1', stale: 'x' }, { a: '1' })).toBe(false);
  });

  it('rejects a rewritten value', () => {
    expect(rendersSameSearch({ a: ' padded ' }, { a: 'padded' })).toBe(false);
  });

  it('rejects a repeated key, which decodes to an array', () => {
    expect(rendersSameSearch({ a: ['1', '2'] }, { a: '1' })).toBe(false);
  });
});

describe('createValidatedSearchRedirect', () => {
  it('is a no-op on a context whose matches carry no strict search', () => {
    const cleanup = createValidatedSearchRedirect({ stringifySearch });

    expect(() =>
      cleanup({
        location: { pathname: '/plain', hash: '', search: {} },
        matches: [],
      }),
    ).not.toThrow();
  });
});

describe('createSearchParamStripper', () => {
  it('is a no-op when the key is already absent', () => {
    const strip = createSearchParamStripper('item', { stringifySearch });

    expect(() =>
      strip({ location: { pathname: '/items/42', hash: '' }, search: {} }),
    ).not.toThrow();
  });
});
