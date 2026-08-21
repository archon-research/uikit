import {
  createRootRoute,
  createRoute,
  createRouter,
  parseSearchWith,
  redirect,
  stringifySearchWith,
} from '@tanstack/react-router';
import { z } from 'zod';

import { oneOfParam, textParam } from './search-params.js';
import {
  createSearchParamStripper,
  createValidatedSearchRedirect,
} from './validated-search.js';

/**
 * Every param these fixtures use is plain text, so the default JSON round trip
 * would write `?rows=1` as `?rows=%221%22` — a shape no real link uses. Matching
 * a real app's config here is what makes the settle assertions meaningful.
 */
export const parseSearch = parseSearchWith((value: string) => value);
export const stringifySearch = stringifySearchWith(JSON.stringify);

/**
 * The router's default grammar, restated here so the specs can check the same
 * claims under both. It qss-decodes and then JSON-parses every value still a
 * string, so it coerces strictly more than the identity parser above.
 */
export const jsonParseSearch = parseSearchWith(JSON.parse);
export const jsonStringifySearch = stringifySearchWith(
  JSON.stringify,
  JSON.parse,
);

export const TABS = ['overview', 'detail'] as const;

export const sharedSearchSchema = z.object({
  q: textParam(),
  tab: oneOfParam(TABS),
  item: textParam(),
});

/**
 * A route tree with the three entry-time behaviours under test: the root
 * cleanup, a branch that strips a legacy key, and a branch that does neither.
 *
 * `item` is the legacy key — it rides the query string everywhere except
 * `/items/$itemId`, where the same value lives in the path.
 */
export function createToyRouter() {
  const rootRoute = createRootRoute({
    validateSearch: sharedSearchSchema,
    beforeLoad: createValidatedSearchRedirect({ stringifySearch }),
  });

  const itemsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/items',
  });

  const itemDetailRoute = createRoute({
    getParentRoute: () => itemsRoute,
    path: '$itemId',
    beforeLoad: createSearchParamStripper('item', { stringifySearch }),
  });

  const plainRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/plain',
  });

  return createRouter({
    routeTree: rootRoute.addChildren([
      itemsRoute.addChildren([itemDetailRoute]),
      plainRoute,
    ]),
    trailingSlash: 'never',
    parseSearch,
    stringifySearch,
  });
}

/**
 * A route tree whose schema is *not* idempotent: the param grows on every pass,
 * so the cleanup rewrites a different URL each time and never settles. This is
 * the failure the harness exists to name.
 */
export function createNonConvergingRouter() {
  const rootRoute = createRootRoute({
    validateSearch: z.object({
      grows: z.optional(
        z
          .unknown()
          .transform((value) =>
            typeof value === 'string' && value !== '' ? `${value}x` : undefined,
          ),
      ),
    }),
    beforeLoad: createValidatedSearchRedirect({ stringifySearch }),
  });

  return createRouter({
    routeTree: rootRoute.addChildren([
      createRoute({ getParentRoute: () => rootRoute, path: '/plain' }),
    ]),
    trailingSlash: 'never',
    parseSearch,
    stringifySearch,
  });
}

/**
 * The same schema and cleanup as {@link createToyRouter}, but on the router's
 * *default* search config (JSON parse/stringify) instead of the identity one.
 * Used to show that the harness settles a URL through whichever grammar the
 * caller's options carry.
 */
export function createJsonSearchRouter() {
  const rootRoute = createRootRoute({
    validateSearch: sharedSearchSchema,
    beforeLoad: createValidatedSearchRedirect({
      stringifySearch: (search) => stringifySearchWith(JSON.stringify)(search),
    }),
  });

  return createRouter({
    routeTree: rootRoute.addChildren([
      createRoute({ getParentRoute: () => rootRoute, path: '/plain' }),
    ]),
  });
}

/**
 * A route tree whose `beforeLoad` hooks are `async` — the shape an auth guard or
 * a context fetch normally takes. Their redirect arrives as a rejected promise
 * rather than a synchronous throw, so a harness that does not await would report
 * the rejected route as settled.
 */
export function createAsyncRedirectRouter() {
  const rootRoute = createRootRoute({
    validateSearch: sharedSearchSchema,
  });

  return createRouter({
    routeTree: rootRoute.addChildren([
      createRoute({
        getParentRoute: () => rootRoute,
        path: '/plain',
        beforeLoad: async () => {
          await Promise.resolve();
          throw redirect({ href: '/items', replace: true });
        },
      }),
      createRoute({
        getParentRoute: () => rootRoute,
        path: '/broken',
        beforeLoad: async () => {
          await Promise.resolve();
          throw new Error('async beforeLoad blew up');
        },
      }),
      createRoute({ getParentRoute: () => rootRoute, path: '/items' }),
    ]),
    trailingSlash: 'never',
    parseSearch,
    stringifySearch,
  });
}

/**
 * A route tree whose root schema *rejects* rather than degrading — the shape a
 * plain `z.object({ page: z.number() })` takes, which is the most common way a
 * real app's search validation fails. `matchRoutes` does not throw it: it
 * records the rejection on the match and carries on with an empty strict
 * search, so a harness that did not look would report the unvalidatable URL as
 * settled.
 */
export function createRejectingSchemaRouter() {
  const rootRoute = createRootRoute({
    // Not one of this package's builders, on purpose: these are total by
    // construction, so no URL can reach the branch under test through them.
    validateSearch: z.object({ required: z.string() }),
  });

  return createRouter({
    routeTree: rootRoute.addChildren([
      createRoute({ getParentRoute: () => rootRoute, path: '/plain' }),
    ]),
    trailingSlash: 'never',
    parseSearch,
    stringifySearch,
  });
}

/**
 * A rejecting schema one level *down*, under a root whose `beforeLoad`
 * redirects away from that branch. Production never validates the rejecting
 * route — the ancestor moves the URL first — so the harness must not fail
 * either. This is what pins the rejection check to match order rather than to a
 * sweep over every match up front.
 */
export function createRedirectedPastRejectionRouter() {
  const rootRoute = createRootRoute({
    validateSearch: sharedSearchSchema,
    beforeLoad: ({ location }: { location: { pathname: string } }) => {
      if (location.pathname === '/legacy') {
        throw redirect({ href: '/plain', replace: true });
      }
    },
  });

  return createRouter({
    routeTree: rootRoute.addChildren([
      createRoute({
        getParentRoute: () => rootRoute,
        path: '/legacy',
        validateSearch: z.object({ required: z.string() }),
      }),
      createRoute({ getParentRoute: () => rootRoute, path: '/plain' }),
    ]),
    trailingSlash: 'never',
    parseSearch,
    stringifySearch,
  });
}

/**
 * A route tree whose `beforeLoad` fails for a reason that is not a redirect.
 * The harness must surface it rather than reporting the route as settled.
 */
export function createThrowingRouter() {
  const rootRoute = createRootRoute({
    validateSearch: sharedSearchSchema,
  });

  return createRouter({
    routeTree: rootRoute.addChildren([
      createRoute({
        getParentRoute: () => rootRoute,
        path: '/plain',
        beforeLoad: () => {
          throw new Error('beforeLoad blew up');
        },
      }),
    ]),
    trailingSlash: 'never',
    parseSearch,
    stringifySearch,
  });
}

/**
 * A route tree that redirects by pushing rather than replacing, leaving the
 * rejected URL in the back history.
 */
export function createPushingRouter() {
  const rootRoute = createRootRoute({
    validateSearch: sharedSearchSchema,
  });

  return createRouter({
    routeTree: rootRoute.addChildren([
      createRoute({
        getParentRoute: () => rootRoute,
        path: '/plain',
        beforeLoad: () => {
          throw redirectWithoutReplace('/items');
        },
      }),
      createRoute({ getParentRoute: () => rootRoute, path: '/items' }),
    ]),
    trailingSlash: 'never',
    parseSearch,
    stringifySearch,
  });
}

function redirectWithoutReplace(href: string) {
  const response = new Response(null, { status: 307 }) as Response & {
    options: { href: string; replace: boolean };
  };
  response.options = { href, replace: false };
  return response;
}

/**
 * Values a URL can present to a param parser, spanning everything the query
 * decoder produces (coerced numbers and booleans, the empty string, an array
 * from a repeated key) plus the spellings it deliberately leaves alone.
 */
export const SEARCH_VALUE_CORPUS: readonly unknown[] = [
  undefined,
  null,
  '',
  ' ',
  '  padded  ',
  'overview',
  'detail',
  'DETAIL',
  'unknown',
  'null',
  'undefined',
  'NaN',
  'Infinity',
  '0001',
  '1e5',
  '-0',
  '1',
  '0',
  'true',
  'false',
  0,
  1,
  -1,
  1.5,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  true,
  false,
  ['a', 'b'],
  [],
  {},
  { nested: true },
  () => 'ignored',
  Symbol('ignored'),
  10n,
];
