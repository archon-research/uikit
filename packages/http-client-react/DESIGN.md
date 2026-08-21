# http-client-react — design contract

`@archon-research/http-client-react` binds TanStack Query to an `openapi-fetch`
client. This document is the authoritative statement of what the layer
guarantees, what it deliberately refuses to do, and why.

## Premise: the generated `paths` type is the endpoint definition

There is exactly one description of the API in a consuming app: the
`openapi-typescript` output. `createQueryApi` reads everything off it — which
methods exist on which paths, what params and body each takes, what its 2xx
response is, what its error responses are. Nothing is restated in a hand-written
endpoint registry, a key factory, or a hooks file, because every restatement is
a thing that can drift from the spec while still compiling.

The consequence worth naming: **a mock layer belongs on the same premise.** A
planned sibling package will derive request handlers from the same `paths` type,
so a fixture that no longer matches the API fails to typecheck rather than
silently passing a test.

## Verdict on `openapi-react-query`

We considered depending on `openapi-react-query` (the openapi-ts ecosystem's own
react-query binding) and **hand-rolled instead**, reusing its type *shape* as
prior art.

`openapi-react-query` implements exactly two things: a query key of
`[method, path, init]`, and a `queryFn` that calls the client and re-throws
`error`. Every v1 requirement here replaces one of them:

1. **The key must be canonical.** Its key holds the caller's `init` verbatim, so
   `{ limit, search }` and `{ search, limit }` are different keys for partial
   matching, and a `signal` or a `headers` object in the init lands in the key.
   We cannot fix that by overriding `queryKey`, because its `queryFn` reads the
   init back *out of the key* — a sanitized key would change the request.
2. **Failures must carry status and the parsed body.** It rethrows the bare error
   body, which loses the status code. Its `queryFn` is internal, so this is not
   overridable.
3. **Middleware over the parsed result.** It has none, and `openapi-fetch`'s own
   `use()` middleware works on `Request`/`Response`, which is the wrong altitude
   for response validation.
4. **Tags and invalidation.** It has none.

So the dependency would have bought only the generic signature types — and those
we can get from `openapi-fetch`'s own exported helpers (`MaybeOptionalInit`,
`FetchResponse`) plus `openapi-typescript-helpers`, both already in the tree.
Against that, it adds a package whose react-query and `openapi-fetch` peer
ranges have to stay compatible with our exact pins, for code we override
entirely. The hand-rolled version is ~250 lines of types and ~120 of runtime.

What we *did* borrow, deliberately, is the generic signature shape:
`<TMethod, TPath, TInit, TResponse, TOptions>` with the conditional
`...[init, options]` tuple, the self-referential `TOptions` constraint that makes
`select` infer, and `NoInfer` on the return type. That shape is well-tested
upstream and reinventing it would have been strictly worse.

One dependency was added: `openapi-typescript-helpers@0.1.0`, a types-only
package that `openapi-fetch` already depends on, re-exported from
http-client-core so both packages type against one pinned copy of the OpenAPI
helper types.

## Query key contract

A key is always exactly three elements:

```
[method, path, sanitizeQueryInit(init)]
```

- `method` is the lowercase OpenAPI method; `path` is the path *template*, braces
  intact. Together they are the operation, so `['get', '/users']` prefix-matches
  every cached variant of that endpoint.
- The third element is the **identity-bearing** part of the init only: path
  params, query params, and the body, with object keys sorted at every depth and
  `undefined`-valued properties removed. Arrays keep their order.
- `undefined`, `{}`, `{ params: {} }`, and
  `{ params: { query: { after: undefined } } }` all sanitize to `{}` and share a
  cache entry.
- Per-call transport concerns — `signal`, `fetch`, `headers`, `baseUrl`,
  `parseAs`, the serializers — are **excluded**. They are either
  non-serializable or, in the case of headers, credentials that have no business
  being visible in a cache key or in devtools.

react-query's own `hashKey` already sorts plain-object keys, so canonicalizing is
not what makes two orderings hit the same entry. What it buys is everything that
compares keys *structurally*: partial `invalidateQueries` matching
(`partialDeepEqual` is order- and `undefined`-sensitive), `exact` filters, and a
key you can read in devtools.

**Consequence for header-varying responses.** Because headers are not part of
identity, two requests that differ only by header share a cache entry. If a
response genuinely varies by header (a tenant selector, say), spread the options
and override `queryKey` yourself — the `queryFn` closes over the init rather
than reading it out of the key, so a custom key still issues the right request.

## Error contract

`openapi-fetch` resolves both outcomes into `{ data, error }`; react-query only
treats a rejection as failure. The `queryFn` converts:

- Non-2xx (or any `error`) rejects with `HttpRequestError`, carrying `status`,
  `statusText`, the parsed `body` typed from the operation's error responses, the
  `method`/`path`, and the raw `Response`.
- A 204, or a response with `Content-Length: 0`, resolves to `null` — react-query
  rejects `undefined` as query data.
- A `HEAD` resolves to `null` unconditionally. A HEAD response has no body by
  definition, so `openapi-fetch` parses none; its `Content-Length` echoes the
  size the matching `GET` would have returned, so neither check above catches it.

The declared error type is `HttpRequestError<TErrorBody> | Error`, not
`HttpRequestError` alone. That is honest rather than convenient: a transport
failure or a middleware (response validation, for instance) rejects with
something that is not an HTTP error, so `status` is reachable only after
`isHttpRequestError(error)`. The guard matches on `name` rather than `instanceof`
so it survives a consumer ending up with two copies of the package.

## Middleware contract

`(ctx, next) => Promise<unknown>`, onion order: the instance chain outermost in
declared order, a per-call chain appended innermost. `ctx` carries `method`,
`path`, `operationType` (`'query' | 'mutation'`), and `init` — the init as it
will be handed to `openapi-fetch`, including react-query's abort signal.

Middleware sees the **parsed result**, not `Request`/`Response`. That is the
altitude response validation, timing, and result shimming want. Anything that
needs the raw HTTP objects belongs in `openapi-fetch`'s own `client.use()`.

`next()` with no argument passes the context through; `next(ctx)` rewrites it for
everything downstream. Calling `next` twice from one middleware rejects rather
than issuing the request twice.

The one shipped middleware, `createZodResponseMiddleware`, validates bodies
against the OpenAPI document through http-client-core's
`getComponentSchemaFromOpenApi`, so the runtime schema and the static types come
from the same spec. It **passes the body through unmodified** — it never
substitutes zod's parse output, so the runtime value always matches the
statically inferred one and no coercion happens behind the caller's back.
Compiled schemas are memoized per middleware instance, because
`z.fromJSONSchema` is far too expensive per request.

## Tag contract

Tags are declared in two places and nowhere else:

- the vocabulary, on `createQueryApi(client, { tags })` — which both infers
  `TTag` (so `tags` and `invalidates` are checked against a closed set) and makes
  an unknown tag throw at runtime, catching typos from untyped call sites;
- membership, on the `queryOptions` call that belongs to the tag.

Membership is recorded where the query is described, so the query stays the
single place its cache behaviour lives. On mutation success, tags resolved from
`invalidates` are invalidated through the `QueryClient` react-query passes to the
mutation callback — no `useQueryClient` at the call site, no `QueryClient`
threaded into the api instance.

**Granularity is per `${method} ${path}`, not per key.** Invalidating a tag
invalidates every cached variant of the endpoints under it, whatever their
params. That is what "refetch the user list" almost always means, and it keeps
the registry bounded by endpoint count rather than by cache size. The corollary:
two queries on one endpoint with different tags cannot be invalidated
independently — use the key directly for that.

A tag only matches endpoints that some `queryOptions` call has registered in this
session. Nothing can be cached under an endpoint without such a call, so this is
not a hole in practice; it does mean `taggedEndpoints` is empty until the first
render that declares the tag.

## Type-level guarantees

`createQueryApi`'s implementation is written against loose types and cast once,
at the return. `src/query-api.types.test.ts` is what holds the cast and the
declared surface in agreement — it asserts data/error/param/variable inference
and `@ts-expect-error`s the calls that must not compile. It is checked by
`npm run type:check`, not by the vitest run.

`TPaths` is constrained to `{}` rather than `Record<string, Record<HttpMethod,
{}>>` on the public function: `openapi-typescript` emits absent operations as
`put?: never`, which no `Record<HttpMethod, {}>` accepts. `openapi-fetch`'s
`createClient` makes the same trade.

Both `queryKey` and `queryOptions` wrap their return in `NoInfer`. Without it, a
contextual type on the result — the `queryKey` property of an
`invalidateQueries` filter, say — becomes an inference site that leaves `TInit`
unresolved and makes TypeScript demand the optional `init` argument.

## Deliberately out of v1

- **Optimistic updates and cache updaters.** No `onMutate` rollback helpers, no
  string-DSL updaters. They need per-endpoint knowledge of how a mutation's
  result maps into a query's shape, which is the one thing the OpenAPI document
  does not describe. Invalidation is correct without that knowledge.
- **Cross-tab sync.** No `BroadcastChannel`; use react-query's own persistence
  and broadcast plugins if a consumer needs it.
- **`POST`-backed reads.** `queryOptions` accepts `get` and `head` only. A
  `POST /search` used as a read has to go through `mutationOptions` for now.
- **Infinite queries and suspense wrappers.** Neither has a consumer yet; both
  are additive.
- **Header-varying cache identity.** See the query key contract above.

## Deprecated

`createQueryOptions(queryKey, queryFn)` — the pre-`createQueryApi` shim that
takes a hand-written key and function. Kept working for existing call sites,
marked `@deprecated`, and not to be used in new code.
