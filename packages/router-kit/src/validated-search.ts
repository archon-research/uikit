import { redirect } from '@tanstack/react-router';

export type SearchRecord = Record<string, unknown>;

/**
 * The router's own search stringifier — the very function passed to
 * `createRouter({ stringifySearch })`. Both helpers here build an explicit href,
 * so they need the app's URL grammar rather than a guess at it.
 */
export type StringifySearch = (search: SearchRecord) => string;

export type CanonicalSearchOptions = {
  stringifySearch: StringifySearch;
};

/**
 * The slice of a `beforeLoad` context the cleanup reads. Declared structurally
 * so the real router context is assignable without this package having to name
 * a route tree, a register, or a search type.
 */
export type ValidatedSearchContext = {
  location: { pathname: string; hash: string; search: unknown };
  matches: ReadonlyArray<{ _strictSearch: unknown }>;
};

/**
 * The slice of a `beforeLoad` context {@link createSearchParamStripper} reads.
 * `search` is typed as `object` rather than a record so any route's inferred
 * search type is assignable without needing an implicit index signature.
 */
export type SearchParamStripperContext = {
  location: { pathname: string; hash: string };
  search: object;
};

function toSearchRecord(value: unknown): SearchRecord {
  return typeof value === 'object' && value !== null
    ? (value as SearchRecord)
    : {};
}

function withoutAbsentValues(search: SearchRecord): SearchRecord {
  return Object.fromEntries(
    Object.entries(search).filter(([, value]) => value !== undefined),
  );
}

/**
 * Whether the raw URL search and the validated result would render as the same
 * query string. Compared as text and without regard to order: `?rows=1` decodes
 * to the number `1` while a text schema yields `"1"`, and two orderings of the
 * same keys are the same URL.
 */
export function rendersSameSearch(
  raw: SearchRecord,
  applied: SearchRecord,
): boolean {
  const appliedEntries = Object.entries(withoutAbsentValues(applied));

  return (
    appliedEntries.length === Object.keys(raw).length &&
    appliedEntries.every(([key, value]) => String(raw[key]) === String(value))
  );
}

function canonicalHref(
  location: { pathname: string; hash: string },
  search: SearchRecord,
  stringifySearch: StringifySearch,
): string {
  const hash = location.hash ? `#${location.hash}` : '';
  return `${location.pathname}${stringifySearch(withoutAbsentValues(search))}${hash}`;
}

/**
 * Builds the root route's `beforeLoad` cleanup: when the address bar disagrees
 * with what validation actually applied, replace it with the canonical form.
 *
 * The schemas drop values they cannot honour, but the address bar keeps them —
 * so `?range=90D` reads as ninety days of data next to a chart showing the
 * default, and that URL gets shared. This closes the gap: the URL is either the
 * state on screen or it is rewritten.
 *
 * Belongs on the **root** route, where the last match's `_strictSearch` is the
 * whole applied set (each route's strict search already folds in every parent
 * schema), so one definition covers every leaf.
 *
 * ## Two requirements, both load-bearing
 *
 * **An explicit `href`, not `to: '.'`.** A relative `to` resolves against the
 * *pending* location, which during a `beforeLoad` is the location being
 * navigated to and not necessarily the one whose params were just validated.
 * The href is built from `location.pathname` plus the canonical query, so the
 * target is unambiguous.
 *
 * **Every schema on the route must be total and idempotent.** This helper
 * rewrites the URL to the validated result, and the rewritten URL is validated
 * again on arrival. A param whose output fails to re-validate to itself
 * therefore redirects forever. The builders in `search-params.ts` hold that
 * contract by construction; `settleEntryUrl` (from the `/testing` subpath) is
 * the executable proof for a given route tree, and it is also what catches a
 * `stringifySearch` here that disagrees with the one the router was built with
 * — the mismatch shows up as non-convergence.
 *
 * @example
 * ```ts
 * const stringifySearch = stringifySearchWith(JSON.stringify);
 * const redirectToValidatedSearch = createValidatedSearchRedirect({
 *   stringifySearch,
 * });
 *
 * const rootRoute = createRootRoute({
 *   validateSearch: sharedSearchSchema,
 *   beforeLoad: redirectToValidatedSearch,
 * });
 *
 * export const router = createRouter({ routeTree, stringifySearch });
 * ```
 */
export function createValidatedSearchRedirect(
  options: CanonicalSearchOptions,
): (context: ValidatedSearchContext) => void {
  return ({ location, matches }) => {
    const applied = toSearchRecord(matches[matches.length - 1]?._strictSearch);

    if (rendersSameSearch(toSearchRecord(location.search), applied)) {
      return;
    }

    throw redirect({
      href: canonicalHref(location, applied, options.stringifySearch),
      replace: true,
    });
  };
}

/**
 * Builds a route `beforeLoad` that drops one search key and carries the rest
 * across unchanged — the sibling of the cleanup above, for a param that must
 * not survive on this branch.
 *
 * The case it exists for: a value that moved from the query string into the
 * path (or into another route's namespace) while shared links still carry the
 * old spelling. A leftover key names a second value that nothing reads, and it
 * may disagree with the one on screen. Scoping the strip to the branch that
 * moved it is what keeps the key working everywhere it is still meaningful.
 *
 * Loop-safe for the same reason as the cleanup: the redirect target no longer
 * carries the key, so the next pass is a no-op. Composes with the root cleanup
 * in either order — both converge on the same canonical URL.
 *
 * @example
 * ```ts
 * const detailRoute = createRoute({
 *   getParentRoute: () => rootRoute,
 *   path: '/items/$itemId',
 *   beforeLoad: createSearchParamStripper('item', { stringifySearch }),
 * });
 * ```
 */
export function createSearchParamStripper(
  key: string,
  options: CanonicalSearchOptions,
): (context: SearchParamStripperContext) => void {
  return ({ location, search }) => {
    const record = toSearchRecord(search);

    if (record[key] === undefined) {
      return;
    }

    const { [key]: _stripped, ...rest } = record;

    throw redirect({
      href: canonicalHref(location, rest, options.stringifySearch),
      replace: true,
    });
  };
}
