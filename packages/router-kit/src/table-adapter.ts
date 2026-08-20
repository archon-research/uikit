import { toSearchText } from './search-params.js';

/**
 * The design system's URL-sync seam for `useUrlSyncedTableStateAdapter`,
 * restated here structurally.
 *
 * The upstream type is **not** imported, and the design system is not a
 * dependency of this package in any form. A type-only import would put an
 * unresolvable module reference in the published `.d.ts`; under the
 * `skipLibCheck` that nearly every consumer runs that does not fail — it
 * silently widens the type to `any`, which is worse than no type at all because
 * the widening is invisible. Restating a four-property interface costs nothing
 * and keeps the published declaration self-contained.
 *
 * `table-adapter.sync.test.ts` closes the loop: it imports the upstream
 * interface from the design system's source by relative path (test-only,
 * excluded from `tsconfig.build.json`) and asserts the two are mutually
 * assignable, so a property added, removed, or retyped upstream fails there
 * instead of leaving this describing a seam that no longer exists.
 */
export interface UrlSyncedTableStateAdapter {
  sortParam: string | null;
  setSortParam: (value: string | null) => void;
  searchParam: string | null;
  setSearchParam: (value: string | null) => void;
}

/**
 * The navigation this adapter performs, narrowed to exactly what it asks for.
 * `useNavigate()`'s return value satisfies this directly, so the common case
 * passes it straight through with no wrapper.
 *
 * All three fields are fixed by the adapter rather than exposed as options.
 * `to` is `'.'`: table state belongs to the route the user is already on, and a
 * relative target carries that route's path params without this package having
 * to know them. Unlike in a `beforeLoad` redirect, there is no pending location
 * for `'.'` to resolve against, which is what makes it the right target here.
 */
export type UrlSyncedTableNavigateOptions = {
  to: string;
  search: (previous: Record<string, unknown>) => Record<string, unknown>;
  replace: true;
};

export type UrlSyncedTableNavigate = (
  options: UrlSyncedTableNavigateOptions,
) => unknown;

export type UrlSyncedTableAdapterOptions = {
  /**
   * The route's search object, as read from the router. `undefined` is a normal
   * state, not an error: a table hosted in a drawer that stays mounted across
   * routes reads a non-strict search that does not exist on every one of them,
   * and both params then read as absent.
   */
  search: object | null | undefined;

  /**
   * The key each param occupies. Required, with no default, on purpose: two
   * tables that silently share `sort`/`q` leak whichever state was set last
   * across every switch between them, and the leak reads as a bug in the table
   * rather than in the URL. Naming the keys per route is what prevents it.
   */
  sortKey: string;
  searchKey: string;

  navigate: UrlSyncedTableNavigate;
};

/**
 * Builds the design system's URL-sync adapter over a router search object and a
 * navigate function.
 *
 * Reads through {@link toSearchText}, so a sort spec that the query decoder
 * coerced (`?sort=1` arriving as the number `1`) still reads as text rather
 * than vanishing. Writes patch only their own key and always replace, so table
 * state does not fill the back button with one entry per keystroke.
 *
 * ## The returned object's identity is the caller's problem
 *
 * This is a plain factory, not a hook — nothing here memoizes, and nothing here
 * touches React. That is deliberate, but it puts one obligation on the caller:
 * `useUrlSyncedTableStateAdapter` memoizes the setters it returns *on this
 * object*, so a fresh call per render makes `setGlobalFilter` a new reference
 * every time. Anything holding that reference as an effect dependency — a
 * debounced search commit, most commonly — is then torn down and re-armed on
 * every unrelated re-render, and never fires under a burst of keystrokes.
 *
 * Memoize the call on the search it reads and the navigate it writes through:
 *
 * @example
 * ```ts
 * export function useTableUrlState(): UseUrlSyncedTableReturn {
 *   const search = useSearch({ from: '/items', shouldThrow: false });
 *   const navigate = useNavigate();
 *
 *   const adapter = useMemo(
 *     () =>
 *       createUrlSyncedTableAdapter({
 *         search,
 *         sortKey: 'sort',
 *         searchKey: 'q',
 *         navigate,
 *       }),
 *     [search, navigate],
 *   );
 *
 *   return useUrlSyncedTableStateAdapter(adapter);
 * }
 * ```
 */
export function createUrlSyncedTableAdapter(
  options: UrlSyncedTableAdapterOptions,
): UrlSyncedTableStateAdapter {
  const { search, sortKey, searchKey, navigate } = options;
  const record = (search ?? {}) as Record<string, unknown>;

  const read = (key: string): string | null =>
    toSearchText(record[key]) ?? null;

  const write = (key: string) => (value: string | null) => {
    navigate({
      to: '.',
      search: (previous) => ({ ...previous, [key]: value ?? undefined }),
      replace: true,
    });
  };

  return {
    sortParam: read(sortKey),
    setSortParam: write(sortKey),
    searchParam: read(searchKey),
    setSearchParam: write(searchKey),
  };
}
