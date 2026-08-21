# router-kit — design contract

`@archon-research/router-kit` ships the route-tree-agnostic parts of a TanStack
Router setup. This document states what the layer guarantees, what shape each
dependency takes and why, and what is deliberately absent from v1.

## Premise: consumers adopt the router, not a wrapper

The app owns its route tree, its router instance, and its `Register` declaration.
This package never wraps `createRouter`, never exports a route factory, and never
asks a route to be described twice. What it ships is the handful of pieces that
are identical in every app and that every app therefore rebuilds — usually
slightly wrong, and usually in a way no test catches.

That framing decides the whole surface. Anything that has to know the shape of a
specific route tree belongs in the app; anything that would be a verbatim copy
across apps belongs here.

## The four modules and the failure each removes

**`search-params.ts`** — `parseSearch` decodes the query string before
`validateSearch` sees it, and decoding coerces, so a schema written against
`string` meets numbers, booleans, empty strings, and arrays in production. How
much it coerces depends on the grammar — the default `parseSearchWith(JSON.parse)`
coerces strictly more than an identity parser, which is why the specs check both.
The builders absorb it, and they are total (no input fails, so a route never
throws on a hand-edited URL) and idempotent under either grammar. Idempotence is
not text preservation: the default grammar canonicalizes `?v=1e5` to `100000`
once, and then holds.

**`validated-search.ts`** — the schemas drop what they cannot honour, but the
address bar keeps it, so a URL advertises state the page is not in. The root
cleanup replaces the URL with the canonical form. This is the module that
*consumes* the idempotence contract: it rewrites the URL to the validated result,
and the result is validated again on arrival.

**`table-adapter.ts`** — the design system's table asks for a URL-sync adapter
and deliberately reads no router. Building one is four lines of obvious code plus
three non-obvious constraints (memoized identity, per-route key naming, and a
read that does not normalize), and the non-obvious three are where every
hand-rolled copy goes wrong.

**`testing.ts`** — a redirect chain that does not converge is a hung tab, which
is not visible from inside the app and has no natural unit test. The harness
makes it a thrown error, and does the same for a `validateSearch` that rejected:
the router records that on the match rather than throwing it, so the URL the
schemas could not validate is exactly the one a naive harness would report as
clean.

The dependency between them is one-directional and worth stating: module 2's
termination is module 1's idempotence, and module 4 is the executable proof of
that pairing for a given route tree. That is why all four ship together rather
than as separate concerns.

## Dependency-shape decisions

### `@tanstack/react-router` — peer, `^1.170.0`

The premise of the package. A bundled copy would mean two module instances and
therefore two `Register` interfaces, so the app's own route paths and search
types would not reach this package's helpers; React context is per-copy as well.
(Not `redirect` identity — `isRedirect` tests `instanceof Response` against the
global, so a redirect does survive crossing copies. The types do not.) Declared
as a devDependency at the same line for the test suite, which drives real routers
headlessly.

The floor is the line this package is developed and tested against, and it is
recorded rather than left open for one specific reason: both `validated-search`
and `testing` read **`_strictSearch`**, a router-internal field. It is the only
way to ask a match "what did validation actually apply, with every parent schema
folded in", and there is no public equivalent. It has been stable across the 1.x
line, this package's suite fails loudly if it moves, and the caret range means a
break surfaces on a deliberate upgrade rather than silently.

### `zod` — peer, `^4.0.0`

The opposite call from `http-client-core`, which keeps zod as a plain
*dependency*, and the contrast is the argument.

There, no zod value crosses the package boundary: validation happens inside, and
callers see the parsed result. A second copy of zod would be wasteful but
harmless.

Here schemas cross the boundary in both directions. `textParam()` is built by
this package and composed into `z.object({ ... })` in the app, which is then
handed to `validateSearch`. Schemas from two copies of zod 4 are not reliably
interchangeable in that composition — the types are keyed on zod's own internal
shape — and when they are not, the failure reads as an inscrutable variance error
at the route definition rather than as a duplicate dependency. A peer makes it
one install and the question does not arise.

### `@archon-research/design-system` — not a dependency at all

Not a dependency, not an optional peer. `UrlSyncedTableStateAdapter` is restated
structurally in `table-adapter.ts` as a four-property interface.

A type-only import would be the obvious alternative and is the wrong call, for
the reason charting's DESIGN.md records for `ChartColorToken`: a type-only import
of a module this package does not depend on puts an unresolvable reference in the
published `.d.ts`, and under the `skipLibCheck` that nearly every consumer runs
that does not fail. It silently widens the type to `any`. An invisible `any` in
the one seam whose whole job is to match an upstream contract is worse than no
type at all.

An *optional peer* would make the reference resolvable for consumers who install
the design system and leave it broken for those who do not — the same widening,
conditional on install state. And unlike charting, this package needs nothing
from the design system at runtime, so there is no second reason to keep the link.

`table-adapter.sync.test.ts` closes the loop: it imports the upstream interface
from the design system's **source** by relative path and asserts the two types
are mutually assignable. Two properties of that choice matter:

1. It is a source path, not the package specifier, so the test does not wait on
   another package's build — no CI test-job build step is needed for this
   package.
2. The assertion is type-level, so it is enforced by `npm run type:check`, which
   the lint job runs on **any** `packages/**` change. A property renamed in the
   design system therefore fails CI on the commit that renames it, not on the
   next commit that happens to touch router-kit.

### React — no dependency

`createUrlSyncedTableAdapter` is a plain factory, not a hook. Nothing in this
package imports React or renders anything, which is why it builds on the `node`
tsconfig preset and its suite runs without jsdom.

The cost is real and documented at the call site: memoizing the adapter object
becomes the consumer's obligation, and getting it wrong breaks a debounced search
in a way that looks like a table bug. A `useUrlSyncedTableSearch` hook would own
that instead. It is not here because a hook would pull React and the router's
React bindings into a package whose other three modules need neither, and because
the memo dependencies are the caller's search object — a value only the caller
can name. Revisit if a second consumer writes the same `useMemo`.

## Deliberate design choices worth recording

**The table adapter's read does not reuse `toSearchText`.** It absorbs the same
decoder coercions — a number or boolean reads as its text, an array or object
reads as absent — but it carries a string through byte for byte, where
`toSearchText` trims and degrades empty to absent. Reusing the schema
normalizer here looked like the obvious economy and is a bug: the adapter's read
and write are two ends of one loop (the hook renders `searchParam` straight back
into the search box), so any normalization on the read that the write does not
apply is a value the user cannot type. `'usd '` would write `?q=usd+`, read back
`'usd'`, and put the next keystroke on `'usdc'` — a two-word search term becomes
untypeable, and the table looks broken rather than the URL.

The general rule the two modules split along: **normalization is a schema
concern, applied once at the route boundary; an adapter transports.** A route
that wants trimming declares `textParam()`, which is visible in the schema and
can be swapped for a param that keeps whitespace. Trimming inside the adapter
would be a second copy of that decision with no way to opt out of it.

**The cleanup deletes by default, and the escape hatch is an allowlist.** The
mechanism is subtraction: a key no schema on the route declares is not state, so
it goes. That is indiscriminate on purpose — the alternative, guessing which
unknown keys are "probably meaningful", is how a stale `?range=90D` survives —
but it means a key another system owns is deleted before that system reads it. An
OAuth `?code=…&state=…` on a callback route is the case this is found through,
and the symptom (a login that fails with an empty query string) does not point at
the router.

`preserveKeys` is the exemption, and it is an explicit list rather than a
heuristic for the same reason the deletion is indiscriminate: the app is the only
thing that knows a key is owned elsewhere, and writing it down is the smallest
possible way to say so. A listed key is exempt from the comparison as well as
from the deletion, which is what keeps it from triggering rewrites of its own and
out of the convergence argument entirely.

The one sharp edge, recorded because it cannot be designed away: a listed key
that a schema *also* declares. Validation still wins for a value it produced, but
zod drops absent optional keys from its output, so "no schema declares this key"
and "the schema declared it and rejected the value" are indistinguishable at this
seam — and in the second case the rejected value survives. Hence the documented
rule (list only keys no schema declares) rather than a runtime guard that could
not tell the two apart.

**Factories, not bare functions, for the two `beforeLoad` helpers.** Both need
the app's `stringifySearch`, and a two-argument function cannot be handed
straight to `beforeLoad`. `createValidatedSearchRedirect({ stringifySearch })`
produces exactly the `(ctx) => void` the route option wants.

**`stringifySearch` is injected rather than derived.** The `beforeLoad` context
carries no router, so there is no way to read the app's own stringifier. The
duplication that creates is real, and it is guarded rather than prevented: a
stringifier that disagrees with the router's produces a redirect target the
router reads differently, which is a non-convergent chain, which is what
`settleEntryUrl` throws on.

**Context types are declared structurally and widely.** `location.search` is
`unknown` and the stripper's `search` is `object`, so any route's inferred search
type is assignable without needing an implicit index signature — an app that
names its search type with an `interface` would otherwise fail to compile at the
route definition.

**The harness is async.** `resolveEntryUrl` awaits each `beforeLoad`, so the
public API is `Promise`-returning. That is not a stylistic choice: an `async
beforeLoad` — the normal shape for an auth guard or a context fetch — throws its
redirect as a *rejected promise*, which a synchronous `try`/`catch` does not see.
A sync harness reports the rejected route as the settled one, so the consumer's
assertion passes while production redirects elsewhere, and the redirect escapes
as an unattributed unhandled rejection naming neither the route nor the URL.
Awaiting also subsumes the synchronous case, so both shapes take one path.

**The harness throws rather than returning a failure.** It is a test helper; a
returned error object gets destructured and ignored. A throw cannot be.

**The harness does not assert that a hop replaces rather than pushes.** It did,
and the assertion was unreachable: `followRedirect` — and the `matchRoutes`
rejection path beside it — spread the thrown redirect's options and then override
`replace: true`, so a `beforeLoad` redirect always replaces whatever it declared.
The only way to reach the branch was a hand-built `Response` with fabricated
`options`, which is the tell: a fixture for a router that does not exist. Worse
than redundant, the check was wrong in the one direction that matters — a plain
`throw redirect({ to: '/login' })` leaves `replace` undefined, and the harness
would have failed it while production replaced. `EntryRedirect.replace` is still
reported, now documented as the redirect's declared intent rather than as the
router's behaviour, because a spec pinning what *this package's* helpers write is
a real assertion.

**The harness supplies an `origin`.** Client mode is what makes `beforeLoad` run
the way a cold load runs it, but the router then reads `window.origin`, and that
read is a bare global reference that throws a `ReferenceError` in a headless
runtime rather than yielding `undefined`. A default origin is supplied, and the
caller's own wins if it set one — otherwise the harness would only work under
jsdom, which would force every consumer's router spec into a DOM environment for
no other reason.

**The harness forces `scrollRestoration` off.** The same client mode that makes
`beforeLoad` run like a cold load also arms scroll restoration, from the router
constructor, through bare `history` and `document` references — a
`ReferenceError` in a headless runtime, thrown before a single route is matched.
Since `scrollRestoration: true` is what a real app ships, the harness would have
been unusable for exactly the consumers it is written for. It is forced rather
than defaulted because the caller's value is the thing that must not win, and
nothing is lost: scroll position does not change what a URL means. That is the
line between the options this harness takes verbatim and the ones it overrides —
grammar (`parseSearch`, `stringifySearch`, `trailingSlash`, `caseSensitive`,
`basepath`) is the caller's; browser-only side effects are not.

**`EntryUrlResolution`'s arms each declare the other's fields as
optional-`undefined`.** `redirectTo` stays a real discriminant, but a spec can
read `.replace` or `.routeId` without narrowing first — which is most of what an
assertion wants to do.

## Deliberately out of v1

### Loader and query glue

The obvious next layer — deriving `loaderDeps`, a query key, and a prefetch from
one declaration of "which search params this data depends on" — is not here, and
the reason is that getting its shape wrong is expensive.

The failure it would address is real. `loaderDeps` selects which search params a
loader re-runs for, and a query key restates the same thing for the cache. Add a
param to the schema, wire it into the component, and forget one of those two
restatements: the loader serves data for the old param values, the cache serves a
stale entry under a key that no longer describes it, and nothing errors. The page
shows confidently wrong numbers. That is the drift worth killing.

But a helper that kills it has to know both the router *and* the query layer —
which key shape `createQueryApi` canonicalizes to, how errors are typed, where
tags live — so it is not route-tree-agnostic in the way the four modules above
are. It is the seam between two packages, and its API is the actual design
problem. v1 has one consumer shape to generalize from, which is not enough to
tell a good abstraction from a plausible one. Locking a wrong one in propagates
across every route of every consumer.

So: v1 ships the pieces that are provably generic, and the glue waits for a
second data point. The four modules here are what that glue would be built on
either way.

### Hash-route migration helpers

Apps moving off `#/path` routing need an entry-time bridge that rewrites
`#/items?q=x` into a real path before the router matches, and that bridge is a
natural sibling of `createSearchParamStripper`.

It is out for a different reason: the mapping from old hash routes to new paths
is entirely app-specific, so the only generic part is the mechanism for
*expressing* a mapping — which is the whole design. Written without a real
migration to answer to, it would be a guess at a DSL. Deferred until one exists.

### Not planned

- **Route-tree factories or a `createAppRouter` wrapper.** Against the premise.
- **Param builders for domain types** (addresses, chain ids, date ranges). These
  read as generic and are not: each carries a validation rule that belongs to a
  domain, and a wrong rule here would be silently inherited by every consumer.
  `textParam()` composed with a domain refinement in the app is the intended
  path.
- **A `useSearchParam`-style read hook.** `useSearch` already exists and is typed
  against the app's own route tree, which this package cannot improve on.
