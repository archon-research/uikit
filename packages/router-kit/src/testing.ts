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

/**
 * The URL a resolution is *of*, in the router's own spelling: the location it
 * parsed, which is the string that was passed in for any router without a
 * `basepath` or a `rewrite`, and the rewritten form for one with either.
 *
 * That matters because a URL under a basepath has two spellings — `/app/items`
 * in the address bar, `/items` inside the router — and a `beforeLoad` redirect
 * target is built from `location.pathname`, so it is written in the internal
 * one. Reporting the caller's string verbatim would put both spellings in a
 * single `hops` array: unreadable as a cycle, and a settled URL that depends on
 * which hop produced it. The router's spelling is the one both ends agree on,
 * and it is the space route paths are written in — so a basepath'd app's
 * assertions read like its route tree, with the basepath added back only by the
 * browser.
 */
type ResolvedEntryUrl = {
  url: string;
};

export type EntryRedirect = ResolvedEntryUrl & {
  redirectTo: string;
  /**
   * What the thrown redirect *declared*, not what the router will do: every
   * client path that follows a `beforeLoad` redirect overrides `replace` to
   * `true`, so an undefined here still replaces. Reported so a spec can pin the
   * intent its own helper writes.
   */
  replace: boolean | undefined;
  routeId?: undefined;
  params?: undefined;
  search?: undefined;
};

export type EntryLeaf = ResolvedEntryUrl & {
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
 *
 * @throws when a matched route's `validateSearch` rejected the URL, when a
 * `beforeLoad` throws something that is not a redirect, or when a `beforeLoad`
 * reads a context field a headless pass cannot supply.
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
    // Client mode also arms scroll restoration, and that setup runs from the
    // router *constructor*, before a single route is matched. It assigns
    // `history.scrollRestoration` and calls `document.addEventListener` through
    // bare global references, so headless it throws `ReferenceError: history is
    // not defined` — meaning any app that ships `scrollRestoration: true`, which
    // is most of them, could not run this harness at all.
    //
    // Forced off rather than defaulted, because the caller's value is exactly
    // what must not win here, and nothing is lost by ignoring it: scroll
    // position has no bearing on what a URL means. Matching, search parsing, and
    // `beforeLoad` are all untouched. (`getScrollRestorationKey` and friends go
    // unread for the same reason.)
    scrollRestoration: false,
    history: createMemoryHistory({ initialEntries: [url] }),
  } as EntryRouterOptions);

  const matches = router.matchRoutes(router.latestLocation);

  for (const match of matches) {
    // `matchRoutes` does not throw a `validateSearch` rejection — it records it
    // on the match as `searchError` and carries on with a strict search of `{}`.
    // Left unchecked that is the worst outcome available here: the one URL that
    // *cannot* be validated would be reported as settled, carrying a `search`
    // no schema produced, so a suite whose whole point is that the schemas are
    // total would prove it by asserting on the route where they failed. Hence a
    // throw naming the route and the error, since the schema that rejected is
    // the only thing worth knowing.
    //
    // Checked per match, in match order and before this match's own
    // `beforeLoad`, because that is where the router checks it (`load-client`
    // reads `paramsError ?? searchError` at exactly this point): a rejected
    // match never runs its own `beforeLoad`, while an *ancestor's* has already
    // run and may legitimately have redirected the URL away from the failure.
    // `matchRoutes(location, { throwOnError: true })` would be shorter and is
    // wrong for that reason — it throws during matching, before any
    // `beforeLoad`, so a URL production redirects away from would fail here.
    if (match.searchError !== undefined) {
      throw new Error(
        `route "${match.routeId}" rejected the search in "${url}": ${describeThrown(match.searchError)}`,
        { cause: match.searchError },
      );
    }

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
        url: router.latestLocation.href,
        // Reported as the redirect declared it, not normalized: an `href` is
        // taken verbatim because that is how the router takes it, feeding the
        // string through the location rewrite when it builds the next location —
        // which is exactly what happens when this becomes the next hop's history
        // entry. A `to`-shaped redirect has no string to take, so it is built.
        redirectTo:
          thrown.options.href ?? router.buildLocation(thrown.options).href,
        replace: thrown.options.replace,
      };
    }
  }

  // `matchRoutes` always resolves at least the root route, so an empty list
  // means the router was built wrong rather than that the URL missed.
  const leaf = matches.at(-1);
  if (!leaf) {
    throw new Error(
      `router-kit: matchRoutes returned no matches for ${router.latestLocation.href}`,
    );
  }

  return {
    url: router.latestLocation.href,
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
  /**
   * The URL the chain ends on, in the router's own spelling (see the note on
   * {@link EntryUrlResolution}'s `url`).
   */
  url: string;
  /**
   * Every URL visited, entry first, in order — each one as the router spells it,
   * so a basepath'd chain reads in one space rather than two.
   */
  hops: readonly string[];
  /** The leaf that renders once the chain has run out. */
  result: EntryLeaf;
};

const DEFAULT_MAX_HOPS = 4;

/**
 * Follows an entry URL through every `beforeLoad` redirect to the URL that
 * finally renders, asserting that the chain terminates.
 *
 * Termination is a failure that is invisible from inside the app. A
 * URL-truthfulness cleanup rewrites the address bar to whatever validation
 * applied, so a schema whose output fails to re-validate to itself rewrites the
 * same URL forever. In a browser that is a hung tab with a spinning address bar;
 * here it is a thrown error naming the cycle. The same throw catches a cleanup
 * whose `stringifySearch` disagrees with the router's, because the disagreement
 * is exactly a failure to converge.
 *
 * ## What this deliberately does *not* assert
 *
 * A **pushed** redirect would be the other invisible trap — a rejected URL left
 * in the back history, so the back button walks the user into the redirect
 * again. It is not asserted here because a `beforeLoad` redirect cannot push:
 * every path that follows one (`followRedirect`, and the `matchRoutes` rejection
 * path beside it) spreads the redirect's options and then overrides
 * `replace: true`. Asserting `replace` here would therefore have been worse than
 * redundant — it would fail a perfectly good `throw redirect({ to: '/login' })`,
 * which leaves `replace` undefined and which the router replaces anyway. The
 * flag is still reported on {@link EntryRedirect} so a spec can pin what its own
 * redirect *declares*.
 *
 * @throws when the chain has not settled within `maxHops`, when a matched
 * route's `validateSearch` rejected a hop, or when a `beforeLoad` throws
 * something that is not a redirect.
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
  const hops: string[] = [];
  let current = url;

  for (let hop = 0; hop <= maxHops; hop += 1) {
    const result = await resolveEntryUrl(routerOptions, current);

    // The router's spelling of the URL just resolved, not the string handed in.
    // The two differ under a basepath, where a redirect target is written in the
    // router's internal space while the entry URL is written in the browser's; a
    // chain recorded as a mix of both is unreadable as a cycle.
    hops.push(result.url);

    if (result.redirectTo === null) {
      return { url: result.url, hops, result };
    }

    current = result.redirectTo;
  }

  throw new Error(
    `"${url}" never stopped redirecting within ${pluralizeHops(maxHops)}: ${hops.join(' -> ')}`,
  );
}

function pluralizeHops(count: number): string {
  return count === 1 ? '1 hop' : `${count} hops`;
}

/**
 * The readable half of a thrown value, for a message that has to name why a
 * schema rejected. A `validateSearch` rejection arrives wrapped in the router's
 * `SearchParamError`, whose message is the underlying validation message —
 * zod's key-by-key report, which is the useful part. Anything else a schema can
 * throw is stringified.
 */
function describeThrown(thrown: unknown): string {
  return thrown instanceof Error ? thrown.message : String(thrown);
}
