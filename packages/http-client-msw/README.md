# @archon-research/http-client-msw

Typed [msw](https://mswjs.io) mocks for `@archon-research/http-client-core`.

The generated OpenAPI `paths` type **is** the endpoint definition. The same type
that drives `createApiClient` and `createQueryApi` drives the mock handlers, so a
handler path, its params, and the body it answers with are checked against the
contract — a fixture that no longer matches the API fails to typecheck instead of
quietly making every test that reads it a false pass. See
[DESIGN.md](./DESIGN.md) for the contract, the `openapi-msw` verdict, and the
deliberate limits.

## Installation

```bash
npm install -D @archon-research/http-client-msw msw
```

`msw` is a peer dependency: the service worker script is generated from the
installed msw and version-checked at start, so the app has to own the version.

Generate the worker script once and commit it:

```bash
npx msw init public --save
```

`public/mockServiceWorker.js` is a build artifact that belongs in git — the app
serves it, and `--save` records the path in `package.json` so msw warns when an
upgrade leaves it stale. Adjust `public` if the bundler serves static files from
elsewhere.

## Usage

### 1. Generate types

```bash
npx uikit-openapi-generate --schema openapi.json --output src/api.types.ts
```

The same `src/api.types.ts` the client and query layer already use. Nothing about
the mocks is described twice.

### 2. Write the handlers

Keep them in one module — a `src/mocks/` folder in the app, or a workspace
package (`@your-scope/api-mocks`) when a Playwright suite and a unit-test suite
both consume them:

```ts
// src/mocks/index.ts
import {
  createMockApi,
  createMockStore,
  createSeededRng,
  mockDelay,
  setupMocks,
} from '@archon-research/http-client-msw';

import type { paths } from '../api.types';

// The same baseUrl the app passes to `createApiClient`.
const mock = createMockApi<paths>({ baseUrl: '/api' });

const rng = createSeededRng(1337);
const positions = createMockStore(() =>
  Array.from({ length: 8 }, (_, index) => ({
    id: `p${index + 1}`,
    label: `Position ${index + 1}`,
    health: rng.int(50, 200) / 100,
  })),
);

export const mocks = setupMocks(
  [
    mock.get('/positions', async ({ query, response }) => {
      await mockDelay(300);
      const limit = Number(query.get('limit') ?? '25');

      return response(200).json(positions.list().slice(0, limit));
    }),

    mock.get('/positions/{id}', ({ params, response }) => {
      const position = positions.get(params.id);

      // Both branches are checked: 200 takes a Position, 404 takes the
      // operation's own error body.
      return position
        ? response(200).json(position)
        : response(404).json({ message: `no position ${params.id}` });
    }),

    mock.post('/positions/{id}/close', ({ params, response }) =>
      positions.remove(params.id)
        ? response(204).empty()
        : response(404).json({ message: 'already closed' }),
    ),
  ],
  // Everything a handler writes to is restored by `reset()`.
  { onReset: [positions.reset, rng.reset] },
);
```

For a route the OpenAPI document does not describe at all — an auth callback on
another host, say — `mock.untyped` is msw's own `http` object, and
`response.untyped(new Response(...))` returns an arbitrary response from a typed
handler.

### 3. Run them in the browser (dev, and Playwright)

Start the worker **before** rendering, so no component can fire a request the
worker is not yet intercepting:

```tsx
// src/main.tsx
import { createRoot } from 'react-dom/client';

import { App } from './App';

if (import.meta.env.VITE_API_MOCKS === '1') {
  const { setupMockWorker } = await import(
    '@archon-research/http-client-msw/browser'
  );
  const { mocks } = await import('./mocks');

  // `baseUrl` here is the app's public base path, not the API base: it locates
  // `mockServiceWorker.js` for a subpath deployment.
  const mockWorker = setupMockWorker(mocks, {
    baseUrl: import.meta.env.BASE_URL,
  });

  // Reachable from a Playwright test; see below.
  Object.assign(window, { resetMocks: () => mockWorker.reset() });

  await mockWorker.start();
}

createRoot(document.getElementById('root')!).render(<App />);
```

```bash
VITE_API_MOCKS=1 npm run dev
```

The gate matters as much as the mocks. Vite replaces `import.meta.env.VITE_*`
statically, so with the flag unset the whole branch is dead code and neither msw
nor the fixtures reach a production bundle — which is only true because both
imports are dynamic and behind the check. A runtime `process.env` read or a
static `import` of the mocks module would bundle them either way.

`start()` is idempotent, so a hot reload or a test fixture may call it again
without re-registering the worker.

For a Playwright suite, serve the app with the same flag on — the browser worker
answers from the same handlers — and reset between tests through the hook the
entry exposed:

```ts
// tests/positions.spec.ts
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.resetMocks());
});
```

A full reload re-runs the entry and re-seeds the stores anyway; the explicit
`resetMocks()` matters when a test navigates within the app instead.

### 4. Run them in vitest

Same handler array, node interceptors:

```ts
// src/test-setup.ts
import { setupMockServer } from '@archon-research/http-client-msw/node';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { mocks } from './mocks';

const mockServer = setupMockServer(mocks);

// `onUnhandledRequest` defaults to 'error': an unmocked request in a suite is a
// hole in the fixtures, not something to warn about and scroll past.
beforeAll(() => mockServer.listen());
afterEach(() => mockServer.reset());
afterAll(() => mockServer.close());
```

```ts
// vitest.config.ts
export default defineConfig({
  test: { setupFiles: ['./src/test-setup.ts'] },
});
```

`reset()` covers both kinds of leakage between tests: state a handler wrote, and
handlers a test installed with `mockServer.server.use(...)`.

An origin-relative `baseUrl` works in both environments because handler paths are
matched on any origin by default — msw would otherwise leave a relative path
unmatched under `setupServer`, where every request URL is absolute. Pass
`origin: 'exact'` to `createMockApi` to opt out; see
[DESIGN.md](./DESIGN.md#handler-path-and-origin-matching).

## API surface

| Export | What it does |
| --- | --- |
| `createMockApi<TPaths>(options?)` | Typed handler factories per method, plus `untyped` |
| `setupMocks(handlers, options?)` | Bundles handlers with their state resets, environment-neutral |
| `setupMockWorker(mocks, options?)` | **`/browser`.** Serves them from a service worker; idempotent `start()` |
| `setupMockServer(mocks)` | **`/node`.** Serves them from msw's node interceptors |
| `createMockStore(seedFn, options?)` | In-memory collection so a write shows up in the next read |
| `createSeededRng(seed)` | Deterministic PRNG for reproducible generated fixtures |
| `mockDelay(ms \| { test, dev })` | Env-aware latency; no delay under test by default |
| `resolveMockDelay` / `isTestEnvironment` | The delay decision, for a consumer's own helpers |
| `resolveWorkerScriptUrl` / `normalizeApiBaseUrl` / `resolveHandlerBase` | The URL primitives |
| `buildWorkerStartOptions` / `createIdempotentStart` | **`/browser`.** The start decisions, unit-testable |

Handler and resolver types are re-exported as `MockHandler`,
`MockResponseResolver`, `MockPathsFor`, `MockRequestBodyFor`, and
`MockResponseBodyFor`, so a helper written around a resolver types against the
same msw copy this package resolves.

## Not in v1

Handlers generated from the OpenAPI document, runtime request-body validation,
named scenario switching, GraphQL/websocket typing, per-test handler isolation
via msw's `boundary`, and fault injection are deliberately out of scope — see
[DESIGN.md](./DESIGN.md#deliberately-out-of-v1).

## Peer dependencies

- `msw` (`^2.10.5`)

## See also

- [http-client-core](../http-client-core) for the client factory, the OpenAPI
  type generator, and the zod helpers
- [http-client-react](../http-client-react) for the TanStack Query layer keyed off
  the same `paths` type
