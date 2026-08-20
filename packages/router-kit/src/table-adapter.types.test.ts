import type { NavigateFn } from '@tanstack/react-router';
import { describe, expectTypeOf, it } from 'vitest';

import {
  createUrlSyncedTableAdapter,
  type UrlSyncedTableNavigate,
  type UrlSyncedTableStateAdapter,
} from './table-adapter.js';

/**
 * Type-level coverage of the adapter seam: `useNavigate()`'s return value is
 * accepted with no wrapper, the product fits the design system's hook exactly,
 * both keys are mandatory, and a write cannot be spelled as a push. Checked by
 * `npm run type:check`, so the assertions live in a function that is never
 * called.
 */

const navigate: UrlSyncedTableNavigate = () => undefined;

describe('createUrlSyncedTableAdapter — inference', () => {
  it('is asserted by tsc, not at runtime', () => {
    expectTypeOf(createUrlSyncedTableAdapter).toBeFunction();
  });
});

export function typeAssertions(routerNavigate: NavigateFn): void {
  // The documented usage: `useNavigate()`'s return value goes straight in. This
  // is the assertion behind the claim, not a comment about it.
  expectTypeOf(routerNavigate).toExtend<UrlSyncedTableNavigate>();

  createUrlSyncedTableAdapter({
    search: {},
    sortKey: 'sort',
    searchKey: 'q',
    navigate: routerNavigate,
  });

  expectTypeOf(
    createUrlSyncedTableAdapter({
      search: { sort: 'name:asc' },
      sortKey: 'sort',
      searchKey: 'q',
      navigate,
    }),
  ).toEqualTypeOf<UrlSyncedTableStateAdapter>();

  // Both params carry the empty case as `null`, which is the seam's own spelling.
  expectTypeOf<UrlSyncedTableStateAdapter['sortParam']>().toEqualTypeOf<
    string | null
  >();

  // @ts-expect-error - `searchKey` has no default; sharing one namespace across
  // two tables is the bug this omission would reintroduce
  createUrlSyncedTableAdapter({ search: {}, sortKey: 'sort', navigate });

  createUrlSyncedTableAdapter({
    // @ts-expect-error - a search value is the router's parsed object, never the
    // raw query string
    search: '?sort=name:asc',
    sortKey: 'sort',
    searchKey: 'q',
    navigate,
  });

  const pushingNavigate: UrlSyncedTableNavigate = (options) => {
    // @ts-expect-error - table state always replaces; `replace` is `true`, not
    // `boolean`, so a push cannot be written by mistake
    const pushed: false = options.replace;
    void pushed;
  };
  void pushingNavigate;

  const adapter = createUrlSyncedTableAdapter({
    search: {},
    sortKey: 'sort',
    searchKey: 'q',
    navigate,
  });

  // @ts-expect-error - a setter clears with `null`; `undefined` is the URL's
  // spelling of absence, not the seam's
  adapter.setSortParam(undefined);
}
