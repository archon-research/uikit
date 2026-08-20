import { describe, expect, it, vi } from 'vitest';

import {
  createUrlSyncedTableAdapter,
  type UrlSyncedTableNavigateOptions,
} from './table-adapter.js';

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

  it('reads an empty param as absent', () => {
    const { adapter } = adapterFor({ sort: '', q: '   ' });

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
