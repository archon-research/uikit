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

**`search-params.ts`** — the query decoder coerces values before any parser
runs, so a schema written against `string` meets numbers, booleans, empty
strings, and arrays in production. The builders absorb that, and they are total
(no input fails, so a route never throws on a hand-edited URL) and idempotent (a
normalized value survives a render-and-redecode round trip unchanged).

**`validated-search.ts`** — the schemas drop what they cannot honour, but the
address bar keeps it, so a URL advertises state the page is not in. The root
cleanup replaces the URL with the canonical form. This is the module that
*consumes* the idempotence contract: it rewrites the URL to the validated result,
and the result is validated again on arrival.

**`table-adapter.ts`** — the design system's table asks for a URL-sync adapter
and deliberately reads no router. Building one is four lines of obvious code plus
two non-obvious constraints (memoized identity, per-route key naming), and the
non-obvious two are where every hand-rolled copy goes wrong.

**`testing.ts`** — a redirect chain that does not converge is a hung tab, and one
that pushes instead of replacing is a back-button trap. Neither is visible from
inside the app, and neither has a natural unit test. The harness makes both a
thrown error.

The dependency between them is one-directional and worth stating: module 2's
termination is module 1's idempotence, and module 4 is the executable proof of
that pairing for a given route tree. That is why all four ship together rather
than as separate concerns.

## Dependency-shape decisions

### `@tanstack/react-router` — peer, `^1.170.0`

The premise of the package. A bundled copy would mean two module instances, two
`Register` interfaces, and a `redirect` the app's router does not recognize as
its own. Declared as a devDependency at the same line for the test suite, which
drives real routers headlessly.

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
handed to `validateSearch`. Under two copies of zod 4 that composition does not
typecheck — the schema types are keyed on zod's own internal shape, so a schema
from copy A is not a `$ZodType` of copy B — and the failure reads as an
inscrutable variance error rather than as a duplicate dependency. A peer makes it
one install.

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

**The harness throws rather than returning a failure.** It is a test helper; a
returned error object gets destructured and ignored. A throw cannot be.

**The harness supplies an `origin`.** Client mode is what makes `beforeLoad` run
the way a cold load runs it, but the router then reads `window.origin`, and that
read is a bare global reference that throws a `ReferenceError` in a headless
runtime rather than yielding `undefined`. A default origin is supplied, and the
caller's own wins if it set one — otherwise the harness would only work under
jsdom, which would force every consumer's router spec into a DOM environment for
no other reason.

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
