# @archon-research/http-client-react

TanStack Query bindings for `@archon-research/http-client-core`.

The generated OpenAPI `paths` type **is** the endpoint definition. Methods,
paths, params, request bodies, response types, and error bodies are all read off
it, so there is no second registry of endpoints to keep in step with the API.
See [DESIGN.md](./DESIGN.md) for the contract and its deliberate limits.

## Installation

```bash
npm install @archon-research/http-client-react @archon-research/http-client-core '@tanstack/react-query@^5.89.0' react react-dom
```

`@tanstack/react-query` is a **peer** dependency, so the app owns the version and
the `QueryClient` this package's hooks and options talk to is the same instance
the app's own `useQuery` calls use. See [peer
dependencies](#peer-dependencies) for why the range starts at 5.89.0.

## Usage

### 1. Generate types and create the api

```bash
npx uikit-openapi-generate --schema openapi.json --output src/api.types.ts
```

```ts
// src/api.ts
import { createApiClient, createQueryApi } from '@archon-research/http-client-react';

import type { paths } from './api.types';

const client = createApiClient<paths>('/api');

// Both the paths type and the tag vocabulary are inferred from the arguments.
// Do not pass type arguments explicitly: naming one turns inference off for the
// rest, and `TTag` silently widens to `string`.
export const api = createQueryApi(client, {
  tags: ['positions', 'position', 'alerts'],
});
```

### 2. Provide a QueryClient

```tsx
import { createQueryClient, HttpProvider } from '@archon-research/http-client-react';

const queryClient = createQueryClient();

export function App() {
  return (
    <HttpProvider client={queryClient}>
      <Dashboard />
    </HttpProvider>
  );
}
```

### 3. Query in a component

```tsx
import { isHttpRequestError } from '@archon-research/http-client-react';
import { useQuery } from '@tanstack/react-query';

import { api } from './api';

function PositionPanel({ id }: { id: string }) {
  const { data, isPending, error } = useQuery(
    api.queryOptions(
      'get',
      '/positions/{id}',
      { params: { path: { id }, query: { expand: 'collateral' } } },
      { tags: ['position'], staleTime: 30_000 },
    ),
  );

  if (isPending) return <LoadingIndicator />;
  if (error) {
    // `status` and the parsed error body are only on HTTP failures; a transport
    // error or a validation middleware rejects with a plain Error.
    return (
      <ErrorState
        message={isHttpRequestError(error) ? `HTTP ${error.status}` : error.message}
      />
    );
  }

  return <PositionSummary position={data} />;
}
```

`data` is typed from the operation's 2xx response, the `params` object is typed
from its parameters, and the query key is derived — `['get', '/positions/{id}',
{ path: { id }, query: { expand: 'collateral' } }]` — so two components asking
for the same thing share one cache entry regardless of how they spell the init.

### 4. Mutate, and invalidate by tag

```tsx
import { useMutation } from '@tanstack/react-query';

import { api } from './api';

function ClosePositionButton({ id }: { id: string }) {
  const { mutate, isPending } = useMutation(
    api.mutationOptions('post', '/positions/{id}/close', {
      // A tag, or a callback that derives tags from the mutation's own result.
      invalidates: ['position', (closed) => (closed.liquidated ? 'alerts' : [])],
    }),
  );

  return (
    <Button
      disabled={isPending}
      onClick={() => mutate({ params: { path: { id } } })}
    >
      Close
    </Button>
  );
}
```

The mutation variables are the operation's init, so the body and params are
typed. On success, every query registered under an invalidated tag is
invalidated through the `QueryClient` react-query passes to the mutation — no
`useQueryClient` call and no key factory at the call site.

### 5. Middleware, including response validation

```ts
import {
  createApiClient,
  createQueryApi,
  createZodResponseMiddleware,
  type QueryApiMiddleware,
} from '@archon-research/http-client-react';

import openApiDocument from '../openapi.json';
import type { paths } from './api.types';

const logSlowRequests: QueryApiMiddleware = async (ctx, next) => {
  const startedAt = performance.now();
  try {
    return await next();
  } finally {
    const elapsed = performance.now() - startedAt;
    if (elapsed > 1_000) {
      console.warn(`slow ${ctx.method} ${ctx.path}: ${Math.round(elapsed)}ms`);
    }
  }
};

export const api = createQueryApi(createApiClient<paths>('/api'), {
  tags: ['positions', 'position', 'alerts'],
  middleware: [
    logSlowRequests,
    createZodResponseMiddleware({
      document: openApiDocument,
      schemas: { 'get /positions/{id}': 'Position' },
      // Report drift instead of breaking the screen. Omit to reject instead.
      onInvalid: (error) => console.warn(error.message, error.issues),
    }),
  ],
});
```

Middleware is onion-style over the *parsed result*: `[a, b]` means `a` runs
before `b` on the way in and after it on the way out. A per-call
`middleware: [...]` on `queryOptions`/`mutationOptions` is appended innermost,
which is how you opt one query into response validation rather than all of them.
For middleware that needs the raw `Request`/`Response`, use `openapi-fetch`'s own
`client.use()`.

### Targeting the cache directly

```ts
// Exactly one query.
queryClient.getQueryData(api.queryKey('get', '/positions/{id}', { params: { path: { id } } }));

// Every cached variant of an endpoint — the key's first two elements are the
// operation, and react-query prefix-matches.
await queryClient.invalidateQueries({ queryKey: ['get', '/positions'] });

// Everything under a tag.
await api.invalidateTags(queryClient, ['positions']);
```

`sanitizeQueryInit` and `buildQueryApiKey` are exported for anything that needs
to derive a key outside an api instance.

One caveat on the last line: `invalidateTags` reaches only the endpoints some
`api.queryOptions(…, { tags })` call has registered. An entry written straight
through `setQueryData`, or restored by SSR/persisted-cache hydration, is cached
under a perfectly good key that the tag has never heard of, and the invalidation
skips it silently. Register the endpoint once at module scope, or invalidate by
key prefix — see [the registry's
boundary](./DESIGN.md#the-registrys-boundary).

## API surface

| Export | What it does |
| --- | --- |
| `createQueryApi(client, options?)` | Binds a TanStack Query surface to an `openapi-fetch` client |
| `api.queryOptions(method, path, init?, options?)` | `queryOptions` for a GET/HEAD operation, with a derived key |
| `api.mutationOptions(method, path, options?)` | `mutationOptions` for a POST/PUT/PATCH/DELETE operation |
| `api.queryKey(method, path, init?)` | The derived, branded query key for an operation |
| `api.tagFilter(tag)` | A react-query filter matching every query under a tag |
| `api.invalidateTags(queryClient, tags)` | Invalidates every query under the given tags |
| `api.taggedEndpoints(tag)` | The `${method} ${path}` tokens registered under a tag |
| `createZodResponseMiddleware(options)` | Validates responses against the OpenAPI document |
| `HttpRequestError` / `isHttpRequestError` | The typed failure carrying `status` and the parsed error body |
| `sanitizeQueryInit` / `buildQueryApiKey` / `canonicalizeQueryKeyValue` | The key-derivation primitives |
| `composeMiddleware` | The middleware combinator, for composing chains outside an api |
| `HttpProvider` / `createQueryClient` | `QueryClientProvider` wrapper and client factory |
| `createQueryOptions` | **Deprecated.** Hand-written key + fn shim; use `api.queryOptions` |

## Not in v1

Optimistic updates, cache updaters, cross-tab cache sync, infinite queries, and
`POST`-backed reads are deliberately out of scope — see
[DESIGN.md](./DESIGN.md#deliberately-out-of-v1). A mock layer keyed off the same
`paths` type is planned as a separate package, so a fixture and a request will
be described by one source.

## Peer dependencies

- `react`, `react-dom` — `^19.0.0`
- `@tanstack/react-query` — `^5.89.0`

The react-query floor is not arbitrary. `mutationOptions` invalidates tags
through the `QueryClient` react-query hands to the mutation callback, which means
it needs the four-argument `onSuccess(data, variables, onMutateResult, context)`
signature and `context.client`. Both arrived in **5.89.0**; the release before it
(5.87.4) passes three arguments and no client, so the package does not typecheck
against it. Anything from 5.89.0 up works — the package is developed against the
latest 5.x.

Keeping react-query a peer rather than a dependency is what guarantees one
`QueryClient` and one cache: two copies in the module graph would give the
`HttpProvider` and the app's own hooks separate caches.

## See also

- [http-client-core](../http-client-core) for the client factory and the
  OpenAPI/zod helpers
