/**
 * Testing entry: `@archon-research/router-kit/testing`.
 *
 * Kept behind its own subpath so an app bundle never pulls in the memory-history
 * router this builds. Nothing here is meant to run in production.
 */

import {
  type AnyRouter,
  createMemoryHistory,
  createRouter,
  isRedirect,
} from '@tanstack/react-router';

/**
 * The shipped router's own options object — `router.options`, exported from the
 * app's router module.
 *
 * Taking options rather than a route tree is the entire point of this harness,
 * not a convenience. `parseSearch`, `stringifySearch`, `trailingSlash`,
 * `caseSensitive`, and `basepath` all decide what a URL *means*, and a harness
 * that rebuilt them would be asserting against a URL grammar the app does not
 * use — passing while production breaks, or failing on a difference that only
 * exists in the test. There is one description of the grammar, and it is the
 * one the app runs with.
 */
export type EntryRouterOptions = AnyRouter['options'];

/*
 * The two arms below each declare the other's fields as optional-`undefined`.
 * That keeps `redirectTo` a real discriminant — checking it for `null` narrows
 * to exactly one arm — while letting a spec read `.replace` or `.routeId` off an
 * un-narrowed resolution, which is most of what an assertion wants to do.
 */

export type EntryRedirect = {
  redirectTo: string;
  replace: boolean | undefined;
  routeId?: undefined;
  params?: undefined;
  search?: undefined;
};

export type EntryLeaf = {
  redirectTo: null;
  replace?: undefined;
  routeId: string;
  params: Record<string, string>;
  /**
   * The leaf's own validated view of the search, with every parent schema
   * folded in — not the raw URL search, which also carries whatever the URL
   * happened to hold.
   */
  search: unknown;
};

export type EntryUrlResolution = EntryRedirect | EntryLeaf;

/**
 * The `beforeLoad` arguments this harness can supply. The router's own argument
 * type is a live match context — `context`, `navigate`, `buildLocation`,
 * `abortController`, `preload` — that only a mounted router can build. Entry-time
 * redirects read the location, the matches, the params, and the search, so those
 * four are what a headless pass provides. A `beforeLoad` reading anything else
 * fails loudly here rather than being silently skipped, whether it is sync or
 * async, because the call is awaited.
 */
type HeadlessBeforeLoadArgs = {
  cause: 'enter';
  location: unknown;
  matches: unknown;
  params: Record<string, string>;
  search: unknown;
};

/**
 * Resolves one entry URL the way a cold page load does: match the route tree,
 * run each matched route's `beforeLoad` in order, and report either the redirect
 * it threw or the leaf that would render.
 *
 * Async because `beforeLoad` may be — an auth guard or a context fetch usually
 * is. Each call is awaited, so a redirect thrown from an `async beforeLoad`
 * arrives as a rejection this can catch. A synchronous throw is caught by the
 * same `await`, so both shapes go down one path.
 *
 * `router.load()` is not usable for this — it commits matches through the
 * framework transitioner, so headless it leaves `state.matches` empty.
 */
export async function resolveEntryUrl(
  routerOptions: EntryRouterOptions,
  url: string,
): Promise<EntryUrlResolution> {
  const router = createRouter({
    ...routerOptions,
    isServer: false,
    // Client mode is what makes `beforeLoad` run the way a cold page load runs
    // it. The router then reads `window.origin` for any location it builds, and
    // that read is a bare global reference — in a headless runtime it throws a
    // ReferenceError rather than yielding undefined, so an origin has to be
    // supplied. The caller's own wins if it set one.
    origin: routerOptions.origin ?? 'http://localhost',
    history: createMemoryHistory({ initialEntries: [url] }),
  } as EntryRouterOptions);

  const matches = router.matchRoutes(router.latestLocation);

  for (const match of matches) {
    const { beforeLoad } = router.routesById[match.routeId].options;

    if (!beforeLoad) {
      continue;
    }

    try {
      await (beforeLoad as (args: HeadlessBeforeLoadArgs) => unknown)({
        cause: 'enter',
        location: router.latestLocation,
        matches,
        params: match.params,
        search: match.search,
      });
    } catch (thrown) {
      if (!isRedirect(thrown)) {
        throw thrown;
      }

      return {
        redirectTo:
          thrown.options.href ?? router.buildLocation(thrown.options).href,
        replace: thrown.options.replace,
      };
    }
  }

  const leaf = matches[matches.length - 1];

  return {
    redirectTo: null,
    routeId: leaf.routeId,
    params: leaf.params,
    search: (leaf as { _strictSearch?: unknown })._strictSearch,
  };
}

export type SettleEntryUrlOptions = {
  /**
   * How many redirects the chain may take before this gives up. Counts hops,
   * so the URL is resolved up to `maxHops + 1` times.
   */
  maxHops?: number;
};

export type SettledEntryUrl = {
  /** The URL the address bar ends on. */
  url: string;
  /** Every URL visited, entry first, in order. */
  hops: readonly string[];
  /** The leaf that renders once the chain has run out. */
  result: EntryLeaf;
};

const DEFAULT_MAX_HOPS = 4;

/**
 * Follows an entry URL through every `beforeLoad` redirect to the URL that
 * finally renders, asserting each hop replaces rather than pushes and that the
 * chain terminates.
 *
 * Both assertions cover a failure that is invisible from inside the app:
 *
 * - **Termination.** A URL-truthfulness cleanup rewrites the address bar to
 *   whatever validation applied, so a schema whose output fails to re-validate
 *   to itself rewrites the same URL forever. In a browser that is a hung tab
 *   with a spinning address bar; here it is a thrown error naming the cycle.
 *   The same throw catches a cleanup whose `stringifySearch` disagrees with the
 *   router's, because the disagreement is exactly a failure to converge.
 *
 * - **Replace, not push.** A rejected URL that gets *pushed* stays in the back
 *   history, so the back button walks the user straight into the redirect
 *   again — a trap that no forward navigation ever reveals.
 *
 * @throws when a hop pushes instead of replacing, when the chain has not
 * settled within `maxHops`, or when a `beforeLoad` throws something that is not
 * a redirect.
 *
 * @example
 * ```ts
 * import { settleEntryUrl } from '@archon-research/router-kit/testing';
 *
 * import { router } from '../src/router';
 *
 * it.each(['/', '/items?sort=bogus', '/legacy/path?item=42'])(
 *   'settles %s',
 *   async (url) => {
 *     const settled = await settleEntryUrl(router.options, url);
 *     expect(settled.url).toMatchSnapshot();
 *   },
 * );
 * ```
 */
export async function settleEntryUrl(
  routerOptions: EntryRouterOptions,
  url: string,
  options: SettleEntryUrlOptions = {},
): Promise<SettledEntryUrl> {
  const maxHops = options.maxHops ?? DEFAULT_MAX_HOPS;
  const hops = [url];
  let current = url;

  for (let hop = 0; hop <= maxHops; hop += 1) {
    const result = await resolveEntryUrl(routerOptions, current);

    if (result.redirectTo === null) {
      return { url: current, hops, result };
    }

    if (result.replace !== true) {
      throw new Error(
        `"${current}" redirected to "${result.redirectTo}" without replace, leaving a rejected URL in the back history`,
      );
    }

    current = result.redirectTo;
    hops.push(current);
  }

  throw new Error(
    `"${url}" never stopped redirecting within ${pluralizeHops(maxHops)}: ${hops.join(' -> ')}`,
  );
}

function pluralizeHops(count: number): string {
  return count === 1 ? '1 hop' : `${count} hops`;
}
