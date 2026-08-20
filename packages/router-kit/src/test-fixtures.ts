import {
  createRootRoute,
  createRoute,
  createRouter,
  parseSearchWith,
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
