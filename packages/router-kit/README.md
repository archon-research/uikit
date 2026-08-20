# @archon-research/router-kit

The generic pieces every [TanStack Router](https://tanstack.com/router) app
rebuilds: search-param schemas that never reject, a root-route cleanup that keeps
the address bar honest, an adapter for the design system's URL-synced table, and
a test harness that follows entry URLs to a fixed point.

Consumers adopt `@tanstack/react-router` directly — it stays a peer dependency
and this package never wraps it, never owns your route tree, and never asks you
to describe a route twice. See [DESIGN.md](./DESIGN.md) for the dependency-shape
decisions and what is deliberately not here.

## Installation

```bash
npm install @archon-research/router-kit @tanstack/react-router zod
```

Both are peer dependencies. See [peer-version policy](#peer-version-policy) for
what that means for upgrades.

## The thing to know first: the query decoder coerces

The router decodes the query string **before** any `validateSearch` parser runs.
That decoder rewrites values, so a parser written against `string` meets four
other shapes in production:

| URL             | value your parser actually receives |
| --------------- | ----------------------------------- |
| `?rows=25`      | the number `25`                     |
| `?dense=true`   | the boolean `true`                  |
| `?q=` or `?q`   | the empty string `''`               |
| `?q=a&q=b`      | the array `['a', 'b']`              |

Registering a custom `parseSearch` does not move this: the decoder runs first and
your parser only sees what it produced. This is the single most common source of
"the param works in dev and vanishes in production" — `?page=2` typed by hand
becomes a number, a `z.string()` schema rejects it, and the route throws.

The coercion is narrower than it first looks, and the narrowness is what makes
normalization safe rather than lossy: a number is only produced when the text is
that number's own canonical spelling, so `0001`, `1e5`, `-0`, `Infinity`, `NaN`,
and `null` all stay strings. Every value `toSearchText` returns therefore renders
back to the exact text it came from.

`textParam()` and `oneOfParam()` absorb all of it. Reach for `toSearchText` or
`toSearchOption` directly when a control needs to apply the same rule while
writing a value back.

## Usage

### 1. Describe the search params

```ts
import { oneOfParam, textParam } from '@archon-research/router-kit';
import { z } from 'zod';

export const TABS = ['overview', 'detail'] as const;

export const sharedSearchSchema = z.object({
  q: textParam(),
  tab: oneOfParam(TABS),
});
```

`textParam()` trims and treats empty as absent. `oneOfParam(allowed)` keeps a
value only if it is in the set — pass the set `as const` so the inferred type is
the literal union rather than `string`.

Every builder here is **total** and **idempotent**:

- **Total** — no input fails, so `validateSearch` never rejects a URL. A
  hand-edited, stale, or bot-mangled param degrades to absent and the route still
  renders.
- **Idempotent** — normalizing an already-normalized value, through a full
  render-and-redecode round trip, returns it unchanged.

Idempotence is not a nicety; step 2 does not terminate without it.

### 2. Make the URL tell the truth

The schemas above drop values they cannot honour, but the address bar keeps them.
So `?range=90D` reads as ninety days of data next to a chart showing the default
— and that is the URL that gets shared. `createValidatedSearchRedirect` closes
the gap on the root route: the URL is either the state on screen, or it is
replaced with the one that is.

```ts
import { createValidatedSearchRedirect } from '@archon-research/router-kit';
import {
  createRootRoute,
  createRouter,
  parseSearchWith,
  stringifySearchWith,
} from '@tanstack/react-router';

// Params here are plain text; the default JSON round trip would write
// `?rows=1` as `?rows=%221%22`.
const parseSearch = parseSearchWith((value: string) => value);
const stringifySearch = stringifySearchWith(JSON.stringify);

const rootRoute = createRootRoute({
  validateSearch: sharedSearchSchema,
  component: App,
  beforeLoad: createValidatedSearchRedirect({ stringifySearch }),
});

export const router = createRouter({
  routeTree,
  parseSearch,
  stringifySearch,
});
```

Pass the **same** `stringifySearch` to both. It is the one function the helper
cannot derive, and a mismatch means the cleanup rewrites to a URL the router
reads differently — which shows up as an infinite redirect. Step 4 is what
catches that.

Two properties, both load-bearing:

- **It redirects to an explicit `href`, not `to: '.'`.** A relative target
  resolves against the *pending* location, which during a `beforeLoad` is the
  location being navigated to, not necessarily the one whose params were just
  validated.
- **It requires total, idempotent schemas.** The rewritten URL is validated
  again on arrival, so a param whose output fails to re-validate to itself
  redirects forever.

For the sibling case — a value that moved out of the query string on one branch
while shared links still carry the old key — `createSearchParamStripper` drops
one key and carries the rest across:

```ts
const itemDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/items/$itemId',
  // The id rides in the path here, so a leftover `?item=` names a second one
  // that nothing reads.
  beforeLoad: createSearchParamStripper('item', { stringifySearch }),
});
```

### 3. Sync a table to the URL

`createUrlSyncedTableAdapter` builds the adapter the design system's
`useUrlSyncedTableStateAdapter` takes, reading two search keys and writing them
back with replace semantics.

```ts
import { useUrlSyncedTableStateAdapter } from '@archon-research/design-system';
import type { UseUrlSyncedTableReturn } from '@archon-research/design-system';
import { createUrlSyncedTableAdapter } from '@archon-research/router-kit';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useMemo } from 'react';

export function useItemsTableUrlState(): UseUrlSyncedTableReturn {
  // Not strict: a table in a drawer can stay mounted on a route where this
  // search does not exist, and both params then read as absent.
  const search = useSearch({ from: '/items', shouldThrow: false });
  const navigate = useNavigate();

  const adapter = useMemo(
    () =>
      createUrlSyncedTableAdapter({
        search,
        sortKey: 'sort',
        searchKey: 'q',
        navigate,
      }),
    [search, navigate],
  );

  return useUrlSyncedTableStateAdapter(adapter);
}
```

Three things worth knowing:

- **`useMemo` is required, not tidy.** `useUrlSyncedTableStateAdapter` memoizes
  the setters it returns *on the adapter object*, so a fresh object per render
  makes `setGlobalFilter` a new reference every time. A debounced search commit
  holding that reference as a dependency is then torn down and re-armed on every
  unrelated re-render, and never fires under a burst of keystrokes.
- **`useNavigate()`'s return value goes straight in.** No wrapper: the adapter
  fixes all three navigation fields itself. It navigates with `to: '.'`, which
  keeps the current route's path params — safe here, unlike in a `beforeLoad`
  redirect, because there is no pending location for `'.'` to resolve against.
- **`sortKey` and `searchKey` have no defaults.** Two tables that silently share
  `sort`/`q` leak whichever state was set last across every switch between them,
  and it reads as a bug in the table rather than in the URL.

### 4. Prove the entry URLs settle

`settleEntryUrl` builds a memory-history router from **your exported
`router.options`**, follows every `beforeLoad` redirect to a fixed point, and
asserts each hop replaces rather than pushes.

```ts
import { settleEntryUrl } from '@archon-research/router-kit/testing';
import { describe, expect, it } from 'vitest';

import { router } from '../src/router';

describe('entry URLs', () => {
  it.each([
    '/',
    '/items?tab=bogus',
    '/items/42?item=7',
    '/unknown/deep/path',
  ])('settles %s', (url) => {
    expect(() => settleEntryUrl(router.options, url)).not.toThrow();
  });

  it('rewrites a rejected param out of the address bar', () => {
    expect(settleEntryUrl(router.options, '/items?tab=bogus').url).toBe(
      '/items',
    );
  });
});
```

It takes `router.options` rather than a route tree on purpose. `parseSearch`,
`stringifySearch`, `trailingSlash`, `caseSensitive`, and `basepath` all decide
what a URL *means*; a harness that rebuilt them would assert against a grammar
your app does not use — passing while production breaks, or failing on a
difference that exists only in the test. There is one description of the
grammar, and it is the one the app runs with.

Both assertions cover a failure that is invisible from inside the app:

- **Non-termination** is a hung tab with a spinning address bar. Here it is a
  thrown error naming the cycle it walked. This is also what catches a
  `stringifySearch` that disagrees with the router's.
- **A pushed redirect** leaves the rejected URL in the back history, so the back
  button walks the user straight into the redirect again — a trap no forward
  navigation reveals.

Known limit: the harness supplies a `beforeLoad` with `location`, `matches`,
`params`, and `search`. A `beforeLoad` that reads route `context` or calls
`navigate` throws here rather than being silently skipped — entry-time redirects
do not normally need either.

## Peer-version policy

| Peer                     | Range         |
| ------------------------ | ------------- |
| `@tanstack/react-router` | `^1.170.0`    |
| `zod`                    | `^4.0.0`      |

Both are peers because both cross the API boundary in a way a second copy would
break: the router's `redirect` must be the one your router recognizes, and zod
schemas built here are composed into `z.object({...})` in your app, where two
copies of zod 4 do not typecheck against each other.

The floor is the line this package is developed and tested against, and the caret
means router and zod patch/minor upgrades do not need a release here. The one
thing to know when upgrading the router: the cleanup and the harness both read
`_strictSearch`, a router-internal field. It is stable in practice, and this
package's own suite fails loudly if it moves — but that is why the floor is
recorded rather than left open.

`@archon-research/design-system` is **not** a dependency of this package, not
even an optional peer. The table adapter's type is restated structurally; see
[DESIGN.md](./DESIGN.md).

## Exported surface

From the root entry:

| Export                            | Kind     | Module               |
| --------------------------------- | -------- | -------------------- |
| `toSearchText`                    | function | `search-params`      |
| `toSearchOption`                  | function | `search-params`      |
| `textParam`                       | function | `search-params`      |
| `oneOfParam`                      | function | `search-params`      |
| `SearchTextParam`                 | type     | `search-params`      |
| `SearchOptionParam`               | type     | `search-params`      |
| `createValidatedSearchRedirect`   | function | `validated-search`   |
| `createSearchParamStripper`       | function | `validated-search`   |
| `rendersSameSearch`               | function | `validated-search`   |
| `SearchRecord`                    | type     | `validated-search`   |
| `StringifySearch`                 | type     | `validated-search`   |
| `CanonicalSearchOptions`          | type     | `validated-search`   |
| `ValidatedSearchContext`          | type     | `validated-search`   |
| `SearchParamStripperContext`      | type     | `validated-search`   |
| `createUrlSyncedTableAdapter`     | function | `table-adapter`      |
| `UrlSyncedTableStateAdapter`      | type     | `table-adapter`      |
| `UrlSyncedTableAdapterOptions`    | type     | `table-adapter`      |
| `UrlSyncedTableNavigate`          | type     | `table-adapter`      |
| `UrlSyncedTableNavigateOptions`   | type     | `table-adapter`      |

From `@archon-research/router-kit/testing`:

| Export                | Kind     |
| --------------------- | -------- |
| `settleEntryUrl`      | function |
| `resolveEntryUrl`     | function |
| `EntryRouterOptions`  | type     |
| `EntryUrlResolution`  | type     |
| `EntryRedirect`       | type     |
| `EntryLeaf`           | type     |
| `SettleEntryUrlOptions` | type   |
| `SettledEntryUrl`     | type     |
