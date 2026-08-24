import { describe, expect, it, vi } from 'vitest';

import {
  createUrlSyncedTableAdapter,
  type UrlSyncedTableNavigateOptions,
} from './table-adapter.js';
import { parseSearch, stringifySearch } from './test-fixtures.js';

function adapterFor(search: object | null | undefined) {
  const navigate = vi.fn<(options: UrlSyncedTableNavigateOptions) => void>();
  const adapter = createUrlSyncedTableAdapter({
    search,
    sortKey: 'sort',
    searchKey: 'q',
    navigate,
  });

  return { adapter, navigate };
}

function patchFrom(
  navigate: ReturnType<typeof adapterFor>['navigate'],
  previous: Record<string, unknown>,
) {
  const options = navigate.mock.calls[0]?.[0];
  if (!options) {
    throw new Error('navigate was never called');
  }
  return options.search(previous);
}

describe('createUrlSyncedTableAdapter — reads', () => {
  it('reads each param from its own key', () => {
    const { adapter } = adapterFor({ sort: 'name:desc', q: 'usd' });

    expect(adapter.sortParam).toBe('name:desc');
    expect(adapter.searchParam).toBe('usd');
  });

  it('reads an absent param as null, which is the seam’s empty value', () => {
    const { adapter } = adapterFor({});

    expect(adapter.sortParam).toBeNull();
    expect(adapter.searchParam).toBeNull();
  });

  it('reads a coerced value as text rather than dropping it', () => {
    const { adapter } = adapterFor({ sort: 1, q: true });

    expect(adapter.sortParam).toBe('1');
    expect(adapter.searchParam).toBe('true');
  });

  it('carries a string through verbatim, whitespace and all', () => {
    // The read and the write are two ends of one loop, so a trim here would
    // make `'usd '` read back as `'usd'` and the next keystroke land on
    // `'usdc'`. Trimming is the schema's job, at the route boundary.
    const { adapter } = adapterFor({ sort: ' name:desc ', q: 'usd coin ' });

    expect(adapter.sortParam).toBe(' name:desc ');
    expect(adapter.searchParam).toBe('usd coin ');
  });

  it('reads a present-but-empty param as the empty string it stores', () => {
    const { adapter } = adapterFor({ sort: '', q: '' });

    expect(adapter.sortParam).toBe('');
    expect(adapter.searchParam).toBe('');
  });

  it('reads a value the URL cannot mean as absent', () => {
    const { adapter } = adapterFor({ sort: ['a', 'b'], q: { nested: true } });

    expect(adapter.sortParam).toBeNull();
    expect(adapter.searchParam).toBeNull();
  });

  it.each([{ search: undefined }, { search: null }])(
    'tolerates a search of $search, for a table mounted off-route',
    ({ search }) => {
      const { adapter } = adapterFor(search);

      expect(adapter.sortParam).toBeNull();
      expect(adapter.searchParam).toBeNull();
    },
  );

  it('ignores keys it was not pointed at', () => {
    const adapter = createUrlSyncedTableAdapter({
      search: { sort: 'a', q: 'b', tableSort: 'c', tableQ: 'd' },
      sortKey: 'tableSort',
      searchKey: 'tableQ',
      navigate: vi.fn(),
    });

    expect(adapter.sortParam).toBe('c');
    expect(adapter.searchParam).toBe('d');
  });
});

describe('createUrlSyncedTableAdapter — writes', () => {
  it('replaces rather than pushes, so keystrokes do not fill the back button', () => {
    const { adapter, navigate } = adapterFor({});

    adapter.setSearchParam('usd');

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate.mock.calls[0]?.[0].replace).toBe(true);
  });

  it('navigates in place, so the route’s own path params are preserved', () => {
    const { adapter, navigate } = adapterFor({});

    adapter.setSortParam('name:desc');

    expect(navigate.mock.calls[0]?.[0].to).toBe('.');
  });

  it('patches only its own key, carrying the rest of the search across', () => {
    const { adapter, navigate } = adapterFor({});

    adapter.setSortParam('name:desc');

    expect(patchFrom(navigate, { tab: 'detail', q: 'usd' })).toEqual({
      tab: 'detail',
      q: 'usd',
      sort: 'name:desc',
    });
  });

  it('spells a cleared param as absent, not as an empty string', () => {
    const { adapter, navigate } = adapterFor({ q: 'usd' });

    adapter.setSearchParam(null);

    expect(patchFrom(navigate, { q: 'usd' })).toEqual({ q: undefined });
  });

  it('writes the search param under the search key', () => {
    const { adapter, navigate } = adapterFor({});

    adapter.setSearchParam('usd');

    expect(patchFrom(navigate, {})).toEqual({ q: 'usd' });
  });

  it('writes each setter through the key it was given', () => {
    const navigate = vi.fn<(options: UrlSyncedTableNavigateOptions) => void>();
    const adapter = createUrlSyncedTableAdapter({
      search: {},
      sortKey: 'itemSort',
      searchKey: 'itemQ',
      navigate,
    });

    adapter.setSortParam('name:asc');
    adapter.setSearchParam('usd');

    expect(navigate.mock.calls[0]?.[0].search({})).toEqual({
      itemSort: 'name:asc',
    });
    expect(navigate.mock.calls[1]?.[0].search({})).toEqual({ itemQ: 'usd' });
  });

  it('does not navigate while only reading', () => {
    const { adapter, navigate } = adapterFor({ sort: 'a', q: 'b' });

    expect(adapter.sortParam).toBe('a');
    expect(navigate).not.toHaveBeenCalled();
  });
});

/*
 * The wiring README step 3 describes, end to end: the design system's hook
 * writes `filter || null` on every search-box change and renders
 * `searchParam ?? ''` back into the box, and between those two the value makes a
 * full trip through the URL. A unit test of either end alone cannot see the
 * failure that matters here — read and write disagreeing about whitespace — so
 * these two drive the whole loop, one keystroke at a time.
 */

/** One search-box change: write, render the query string, decode it back. */
function typeInto(
  search: Record<string, unknown>,
  filter: string,
): Record<string, unknown> {
  const { adapter, navigate } = adapterFor(search);

  adapter.setSearchParam(filter || null);

  return parseSearch(stringifySearch(patchFrom(navigate, search))) as Record<
    string,
    unknown
  >;
}

/** What the search box shows for a given URL search, per the hook. */
function renderedFilter(search: Record<string, unknown>): string {
  return adapterFor(search).adapter.searchParam ?? '';
}

describe('createUrlSyncedTableAdapter — the write/read round trip', () => {
  it('holds every keystroke of a multi-word term, spaces included', () => {
    let search: Record<string, unknown> = {};

    for (const typed of [
      'u',
      'us',
      'usd',
      'usd ',
      'usd c',
      'usd co',
      'usd coi',
      'usd coin',
      'usd coin ',
    ]) {
      search = typeInto(search, typed);

      // The failure this pins: with a trimming read, `'usd '` comes back as
      // `'usd'` and the next keystroke types `'usdc'`, so the space can never
      // be entered and a two-word term is untypeable.
      expect(renderedFilter(search)).toBe(typed);
    }

    expect(search).toEqual({ q: 'usd coin ' });
  });

  it('spells the trailing space in the URL and reads it back', () => {
    const { adapter, navigate } = adapterFor({});

    adapter.setSearchParam('usd ');

    expect(stringifySearch(patchFrom(navigate, {}))).toBe('?q=usd+');
    expect(renderedFilter({ q: 'usd ' })).toBe('usd ');
  });

  it('clears back to an empty box and an empty URL', () => {
    const search = typeInto({ q: 'usd coin ' }, '');

    expect(search).toEqual({});
    expect(renderedFilter(search)).toBe('');
  });
});
