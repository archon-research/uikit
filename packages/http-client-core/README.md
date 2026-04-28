# @archon-research/http-client-core

Typed HTTP client utilities built on OpenAPI and Zod for end-to-end request/response validation.

## Installation

```bash
npm install @archon-research/http-client-core openapi-fetch
npm install --save-dev openapi-typescript
```

## Features

- Type-safe HTTP client using OpenAPI specifications
- Built-in Zod schema validation for responses
- Automatic TypeScript types from OpenAPI specs
- Request and response interceptors

## Usage

### Generate types from OpenAPI spec

```bash
npx openapi-typescript api.yaml -o src/api.types.ts
```

### Create a typed client

```typescript
import createClient from 'openapi-fetch';
import type { paths } from './api.types';

const client = createClient<paths>({
  baseUrl: 'https://api.example.com',
});

// Fully typed requests and responses
const { data, error } = await client.GET('/users/{id}', {
  params: { path: { id: '123' } },
});
```

### Validate responses with Zod

```typescript
import { z } from 'zod';
import { createValidatedClient } from '@archon-research/http-client-core';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

// Client with automatic validation
const validatedClient = createValidatedClient(client, {
  'GET /users/{id}': UserSchema,
});
```

## Peer dependencies

- `openapi-typescript`: For generating types from OpenAPI specs

## See also

- [http-client-react](../http-client-react) for React Query integration
