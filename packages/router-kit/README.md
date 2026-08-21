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

`@tanstack/react-router` and `zod` are both peer dependencies. See
[peer-version policy](#peer-version-policy) for what that means for upgrades.

## The thing to know first: the query decoder coerces

Your `validateSearch` never sees the raw query text — `parseSearch` has already
decoded it, and decoding rewrites values. So a parser written against `string`
meets four other shapes in production:

| URL             | value your parser actually receives |
| --------------- | ----------------------------------- |
| `?rows=25`      | the number `25`                     |
| `?dense=true`   | the boolean `true`                  |
| `?q=` or `?q`   | the empty string `''`               |
| `?q=a&q=b`      | the array `['a', 'b']`              |

This is the single most common source of "the param works in dev and vanishes in
production" — `?page=2` typed by hand becomes a number, a `z.string()` schema
rejects it, and the route throws.

How much coercion depends on which grammar your router was built with, and both
common choices coerce:

- **`parseSearchWith(JSON.parse)`** — the router's default, so this is what you
  get by not configuring one. It applies the decode above and then `JSON.parse`s
  every value still a string, so `?v=1e5` arrives as `100000`, `?v=null` as
  `null`, and `?v=-0` as `0`.
- **`parseSearchWith((value) => value)`** — the identity parser, for apps whose
  params are all plain text. It stops after the decode, so those three stay
  strings.

A hand-written `parseSearch` *is* the decoder rather than a stage after it, so it
can opt out — but then it owns the whole grammar.

`toSearchText` is idempotent under either: feed its own output back through a
render-and-redecode round trip and you get that output unchanged. What it does
**not** promise is byte-preserved URL text — under the default grammar `?v=1e5`
canonicalizes to `100000`, because the value really was decoded to a number.
That is one rewrite, not a loop; the second pass is stable, and step 4 is what
proves it.

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

#### Declare it or lose it

Read the mechanism literally: **any key no schema on the route declares is
deleted from the URL.** That is the feature — a stale `?range=90D` has to go —
and it does not know what it is deleting. A param some *other* system owns is
undeclared from this route's point of view, and it goes just as fast.

The way this is found in production is an OAuth callback. The provider returns
the user to `/callback?code=…&state=…`, the root cleanup runs first, and the
callback route reads an empty query string. The login fails, and nothing in the
logs mentions the URL. Same shape for a `?utm_source=…` a tag manager reads on
load, or a `?session_id=…` a payment provider appends.

Two ways out, and the first is usually right:

1. **Declare the key in a route schema.** Then it is typed, it is part of the
   route's contract, and `useSearch` can read it.
2. **Allowlist it**, for keys something outside the route tree owns:

```ts
beforeLoad: createValidatedSearchRedirect({
  stringifySearch,
  preserveKeys: ['code', 'state'],
});
```

An allowlisted key is exempt from the deletion *and* from the comparison, so its
presence never triggers a rewrite on its own, and it cannot be the param that
fails to converge. List only keys no schema declares: a listed key never
overrides a value validation produced, but for a value validation *rejected*
there is no applied value to lose to, so the rejected one survives in the address
bar — which is the lie this whole step exists to remove.

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

Four things worth knowing:

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
- **The read is verbatim; the schema owns trimming.** A string param reaches the
  table exactly as the URL holds it, whitespace included, so a write-read-write
  round trip is lossless. It has to be: the hook renders `searchParam` back into
  the search box, so an adapter that trimmed would make `'usd '` read back as
  `'usd'`, land the next keystroke on `'usdc'`, and leave a two-word term
  untypeable. Trim at the route boundary instead, where it is visible and
  opt-out-able — `textParam()` does exactly that. Values the URL cannot mean (a
  repeated key's array, an object) read as absent, and a number or boolean the
  decoder produced reads as its text.

### 4. Prove the entry URLs settle

`settleEntryUrl` builds a memory-history router from **your exported
`router.options`**, follows every `beforeLoad` redirect to a fixed point, and
throws if the chain never gets there.

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
  ])('settles %s', async (url) => {
    await expect(settleEntryUrl(router.options, url)).resolves.toBeDefined();
  });

  it('rewrites a rejected param out of the address bar', async () => {
    const settled = await settleEntryUrl(router.options, '/items?tab=bogus');

    expect(settled.url).toBe('/items');
  });
});
```

Both entry points are async, so `await` them. That is not incidental: a
`beforeLoad` is often `async` — an auth guard or a context fetch — and its
redirect then arrives as a rejected promise rather than a synchronous throw. A
harness that did not await would report the *rejected* route as the settled one,
so your spec would pass while production redirected somewhere else.

It takes `router.options` rather than a route tree on purpose. `parseSearch`,
`stringifySearch`, `trailingSlash`, `caseSensitive`, and `basepath` all decide
what a URL *means*; a harness that rebuilt them would assert against a grammar
your app does not use — passing while production breaks, or failing on a
difference that exists only in the test. There is one description of the
grammar, and it is the one the app runs with.

Each throw covers a failure that is invisible from inside the app:

- **Non-termination** is a hung tab with a spinning address bar. Here it is a
  thrown error naming the cycle it walked. This is also what catches a
  `stringifySearch` that disagrees with the router's.
- **A schema that rejected the URL** is a thrown error naming the route and the
  validation message. The router does not throw one: it records the rejection on
  the match and carries on with a search no schema produced. So a harness that
  did not look would report the one URL your schemas *could not* validate as
  settled and clean. Step 1's builders are total, so this fires for a schema
  that is not — a bare `z.number()` on a param, most often.

It does **not** assert that a hop replaces rather than pushes, because a
`beforeLoad` redirect cannot push: every path that follows one overrides
`replace: true` over the redirect's own options. Such an assertion would fail a
perfectly good `throw redirect({ to: '/login' })` — `replace` undefined, replaced
anyway. `resolveEntryUrl` still reports `replace` if you want to pin what your
own helper *declares*.

Two options of yours are overridden rather than honoured, both because a
headless run cannot mean them: `isServer` is forced false (client mode is what
makes `beforeLoad` run the way a cold load runs it) and `scrollRestoration` is
forced off. The second is not cosmetic — the router arms scroll restoration from
its own constructor via bare `history` and `document` references, so leaving it
on would throw `ReferenceError: history is not defined` before a route was
matched, and every app that sets it would find the harness unusable. Neither
option has any bearing on what a URL means.

Known limit: the harness supplies a `beforeLoad` with `location`, `matches`,
`params`, and `search`. A `beforeLoad` that reads route `context` or calls
`navigate` fails loudly here rather than being silently skipped — entry-time
redirects do not normally need either, and a loud failure is the point.

## Peer-version policy

| Peer                     | Range         |
| ------------------------ | ------------- |
| `@tanstack/react-router` | `^1.170.0`    |
| `zod`                    | `^4.0.0`      |

Both are peers because a second copy of either would break something real:

- **The router** carries its types through module augmentation. Your
  `declare module '@tanstack/react-router' { interface Register { ... } }` binds
  to one copy, so a second one leaves your route paths and search types
  unavailable to it. React context is per-copy too, so hooks from one copy return
  nothing inside the other's provider.
- **zod** schemas built here are composed into `z.object({ ... })` in your app.
  Schemas from two copies are not reliably interchangeable, and when they are
  not, the failure reads as an opaque variance error at the route definition
  rather than as a duplicate dependency.

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
| `ValidatedSearchRedirectOptions`  | type     | `validated-search`   |
| `ValidatedSearchContext`          | type     | `validated-search`   |
| `SearchParamStripperContext`      | type     | `validated-search`   |
| `createUrlSyncedTableAdapter`     | function | `table-adapter`      |
| `UrlSyncedTableStateAdapter`      | type     | `table-adapter`      |
| `UrlSyncedTableAdapterOptions`    | type     | `table-adapter`      |
| `UrlSyncedTableNavigate`          | type     | `table-adapter`      |
| `UrlSyncedTableNavigateOptions`   | type     | `table-adapter`      |

From `@archon-research/router-kit/testing`:

| Export                  | Kind     |
| ----------------------- | -------- |
| `settleEntryUrl`        | function |
| `resolveEntryUrl`       | function |
| `EntryRouterOptions`    | type     |
| `EntryUrlResolution`    | type     |
| `EntryRedirect`         | type     |
| `EntryLeaf`             | type     |
| `SettleEntryUrlOptions` | type     |
| `SettledEntryUrl`       | type     |

Both functions return promises — see [step 4](#4-prove-the-entry-urls-settle).

## See also

- [design-system](../design-system) for `useUrlSyncedTableStateAdapter` and the
  `DataTable` this package's adapter feeds
- [http-client-react](../http-client-react) for the TanStack Query layer that a
  future loader/query glue would have to straddle (see
  [DESIGN.md](./DESIGN.md#loader-and-query-glue))
