# @archon-research/http-client-core

Typed HTTP client utilities built on OpenAPI and Zod: an `openapi-fetch` client
factory, the OpenAPI helper types the rest of the toolkit shares, and helpers
that turn a document's component schemas into zod validators.

## Installation

```bash
npm install @archon-research/http-client-core
npm install --save-dev openapi-typescript
```

## Usage

### Generate types from an OpenAPI document

```bash
npx uikit-openapi-generate --schema openapi.json --output src/api.types.ts
```

### Create a typed client

```typescript
import { createApiClient } from '@archon-research/http-client-core';

import type { paths } from './api.types';

const client = createApiClient<paths>('https://api.example.com');

// Fully typed request and response
const { data, error } = await client.GET('/users/{id}', {
  params: { path: { id: '123' } },
});
```

The second argument is the rest of the `openapi-fetch` client config (everything
except `baseUrl`), which is how a test or a mock layer injects its own `fetch`:

```typescript
const client = createApiClient<paths>('https://api.example.com', {
  fetch: myFetch,
  headers: { 'X-Tenant': tenantId },
});
```

### Build a zod validator from a component schema

```typescript
import { getComponentSchemaFromOpenApi } from '@archon-research/http-client-core';

import openApiDocument from '../openapi.json';

const userSchema = getComponentSchemaFromOpenApi(openApiDocument, 'User');
const result = userSchema.safeParse(await response.json());
```

`normalizeOpenApiRefs` is exported for documents that need their
`#/components/schemas/...` refs rewritten to zod's `#/$defs/...` form ahead of
time; `getComponentSchemaFromOpenApi` applies it internally.

For response validation wired into TanStack Query, use
`createZodResponseMiddleware` from
[http-client-react](../http-client-react) rather than calling this directly.

### Shared OpenAPI types

The `openapi-fetch` and `openapi-typescript-helpers` types that anything built on
this client needs are re-exported here — `ApiClient`, `ApiClientOptions`,
`FetchResponse`, `MaybeOptionalInit`, `HttpMethod`, `MediaType`,
`PathsWithMethod`, `RequiredKeysOf` — so downstream packages type against one
pinned copy of the OpenAPI toolchain instead of each declaring their own
dependency on it.

## Peer dependencies

- `openapi-typescript`: for generating types from OpenAPI documents

## See also

- [http-client-react](../http-client-react) for the TanStack Query layer
