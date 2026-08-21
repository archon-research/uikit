import { createApiClient } from '@archon-research/http-client-core';
import { MutationObserver, QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { HttpRequestError, isHttpRequestError } from './errors.js';
import type { QueryApiMiddleware } from './middleware.js';
import { createQueryApi } from './query-api.js';
import {
  createFetchStub,
  emptyResponse,
  headResponse,
  jsonResponse,
  type TestPaths,
  type TestTag,
  type User,
} from './test-fixtures.js';
import { createZodResponseMiddleware } from './zod-response.js';

const ada: User = { id: 'u1', name: 'Ada' };

/** Retries off, so a failure assertion does not wait out the backoff. */
function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function setup(
  options: {
    middleware?: readonly QueryApiMiddleware[];
    tags?: readonly TestTag[];
  } = {},
) {
  const stub = createFetchStub({
    'GET /users': () => jsonResponse([ada]),
    'GET /users/u1': () => jsonResponse(ada),
    'GET /users/missing': () => jsonResponse({ message: 'no such user' }, 404),
    'HEAD /users': () => headResponse(),
    'POST /users': async (request) => {
      const body = (await request.json()) as { name: string };
      return jsonResponse({ id: 'u2', name: body.name }, 201);
    },
    'DELETE /users/u1': () => emptyResponse(),
  });

  const client = createApiClient<TestPaths>('https://api.test', {
    fetch: stub.fetch,
  });

  return {
    stub,
    queryClient: createTestQueryClient(),
    api: createQueryApi(client, {
      tags: options.tags ?? (['users', 'user'] as const),
      middleware: options.middleware,
    }),
  };
}

describe('queryOptions', () => {
  it('fetches through the typed client and derives the query key', async () => {
    const { api, queryClient, stub } = setup();

    const options = api.queryOptions('get', '/users', {
      params: { query: { limit: 10 } },
    });

    await expect(queryClient.fetchQuery(options)).resolves.toEqual([ada]);
    expect(options.queryKey).toEqual([
      'get',
      '/users',
      { query: { limit: 10 } },
    ]);
    expect(stub.requests[0]?.url).toBe('/users?limit=10');
  });

  it('serializes path params into the request URL', async () => {
    const { api, queryClient, stub } = setup();

    await queryClient.fetchQuery(
      api.queryOptions('get', '/users/{id}', {
        params: { path: { id: 'u1' } },
      }),
    );

    expect(stub.requests[0]?.url).toBe('/users/u1');
  });

  it('shares one cache entry across param orderings', async () => {
    const { api, queryClient, stub } = setup();

    // `staleTime` so the second fetch is a cache read: identical requests
    // written in a different key order have to land on the same entry.
    await queryClient.fetchQuery(
      api.queryOptions(
        'get',
        '/users',
        { params: { query: { limit: 10, search: 'ada' } } },
        { staleTime: Infinity },
      ),
    );
    await queryClient.fetchQuery(
      api.queryOptions(
        'get',
        '/users',
        { params: { query: { search: 'ada', limit: 10 } } },
        { staleTime: Infinity },
      ),
    );

    expect(queryClient.getQueryCache().getAll()).toHaveLength(1);
    expect(stub.requests).toHaveLength(1);
  });

  it('rejects with a typed error carrying status and parsed body', async () => {
    const { api, queryClient } = setup();

    const error = await queryClient
      .fetchQuery(
        api.queryOptions('get', '/users/{id}', {
          params: { path: { id: 'missing' } },
        }),
      )
      .catch((thrown: unknown) => thrown);

    expect(isHttpRequestError(error)).toBe(true);
    if (!isHttpRequestError<{ message: string }>(error)) return;

    expect(error).toBeInstanceOf(HttpRequestError);
    expect(error.status).toBe(404);
    expect(error.body).toEqual({ message: 'no such user' });
    expect(error.method).toBe('get');
    expect(error.path).toBe('/users/{id}');
    expect(error.message).toContain('GET /users/{id}');
  });

  it('resolves a HEAD to null even when Content-Length is non-zero', async () => {
    const { api, queryClient, stub } = setup();

    // `openapi-fetch` never parses a body for HEAD, so `data` is `undefined`
    // however the response is framed. Without the HEAD branch this rejects
    // with react-query's "Query data cannot be undefined".
    await expect(
      queryClient.fetchQuery(api.queryOptions('head', '/users')),
    ).resolves.toBeNull();
    expect(stub.requests[0]?.method).toBe('HEAD');
  });

  it("threads react-query's abort signal into the request init", async () => {
    let seen: unknown;
    const { api, queryClient } = setup({
      middleware: [
        async (ctx, next) => {
          seen = ctx.init?.signal;
          return await next();
        },
      ],
    });

    await queryClient.fetchQuery(api.queryOptions('get', '/users'));

    expect(seen).toBeInstanceOf(AbortSignal);
  });
});

describe('mutationOptions', () => {
  it('sends the mutation variables as the request init', async () => {
    const { api, queryClient, stub } = setup();

    const observer = new MutationObserver(
      queryClient,
      api.mutationOptions('post', '/users'),
    );

    await expect(observer.mutate({ body: { name: 'Grace' } })).resolves.toEqual(
      {
        id: 'u2',
        name: 'Grace',
      },
    );
    expect(stub.requests[0]?.method).toBe('POST');
    expect(stub.requests[0]?.body).toBe('{"name":"Grace"}');
  });

  it('resolves to null for a 204 with no body', async () => {
    const { api, queryClient } = setup();

    const observer = new MutationObserver(
      queryClient,
      api.mutationOptions('delete', '/users/{id}'),
    );

    await expect(
      observer.mutate({ params: { path: { id: 'u1' } } }),
    ).resolves.toBeNull();
  });

  it('invalidates the queries registered under an invalidated tag', async () => {
    const { api, queryClient } = setup();

    const listOptions = api.queryOptions('get', '/users', undefined, {
      tags: ['users'],
    });
    const detailOptions = api.queryOptions(
      'get',
      '/users/{id}',
      { params: { path: { id: 'u1' } } },
      { tags: ['user'] },
    );

    await queryClient.fetchQuery(listOptions);
    await queryClient.fetchQuery(detailOptions);

    const observer = new MutationObserver(
      queryClient,
      api.mutationOptions('post', '/users', { invalidates: ['users'] }),
    );
    await observer.mutate({ body: { name: 'Grace' } });

    expect(queryClient.getQueryState(listOptions.queryKey)?.isInvalidated).toBe(
      true,
    );
    expect(
      queryClient.getQueryState(detailOptions.queryKey)?.isInvalidated,
    ).toBe(false);
  });

  it('invalidates every cached variant of a tagged endpoint', async () => {
    const { api, queryClient } = setup();

    const first = api.queryOptions(
      'get',
      '/users',
      { params: { query: { limit: 1 } } },
      { tags: ['users'] },
    );
    const second = api.queryOptions(
      'get',
      '/users',
      { params: { query: { limit: 2 } } },
      { tags: ['users'] },
    );

    await queryClient.fetchQuery(first);
    await queryClient.fetchQuery(second);

    const observer = new MutationObserver(
      queryClient,
      api.mutationOptions('post', '/users', { invalidates: ['users'] }),
    );
    await observer.mutate({ body: { name: 'Grace' } });

    expect(queryClient.getQueryState(first.queryKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(second.queryKey)?.isInvalidated).toBe(
      true,
    );
  });

  it('resolves tags produced from the mutation result', async () => {
    const { api, queryClient } = setup();

    const detailOptions = api.queryOptions(
      'get',
      '/users/{id}',
      { params: { path: { id: 'u1' } } },
      { tags: ['user'] },
    );
    await queryClient.fetchQuery(detailOptions);

    const observer = new MutationObserver(
      queryClient,
      api.mutationOptions('post', '/users', {
        invalidates: [(created) => (created.name === 'Grace' ? 'user' : [])],
      }),
    );
    await observer.mutate({ body: { name: 'Grace' } });

    expect(
      queryClient.getQueryState(detailOptions.queryKey)?.isInvalidated,
    ).toBe(true);
  });

  it('still calls a caller-supplied onSuccess', async () => {
    const { api, queryClient } = setup();
    const onSuccess = vi.fn();

    const observer = new MutationObserver(
      queryClient,
      api.mutationOptions('post', '/users', {
        invalidates: ['users'],
        onSuccess,
      }),
    );
    await observer.mutate({ body: { name: 'Grace' } });

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess.mock.calls[0]?.[0]).toEqual({ id: 'u2', name: 'Grace' });
  });

  it('rejects with a typed error on a failed mutation', async () => {
    const { api, queryClient } = setup();

    const observer = new MutationObserver(
      queryClient,
      api.mutationOptions('delete', '/users/{id}'),
    );

    const error = await observer
      .mutate({ params: { path: { id: 'missing' } } })
      .catch((thrown: unknown) => thrown);

    // No stub route for DELETE /users/missing — the stub answers 501.
    expect(isHttpRequestError(error)).toBe(true);
    if (isHttpRequestError(error)) expect(error.status).toBe(501);
  });
});

describe('tags', () => {
  it('exposes the endpoints registered under a tag', () => {
    const { api } = setup();

    api.queryOptions('get', '/users', undefined, { tags: ['users'] });
    api.queryOptions(
      'get',
      '/users/{id}',
      { params: { path: { id: 'u1' } } },
      { tags: ['users'] },
    );

    expect(api.taggedEndpoints('users')).toEqual([
      'get /users',
      'get /users/{id}',
    ]);
  });

  it('throws on a tag outside the declared vocabulary', () => {
    const { api } = setup();

    expect(() =>
      api.queryOptions('get', '/users', undefined, {
        tags: ['orders' as TestTag],
      }),
    ).toThrow(/unknown tag "orders"/);
  });

  it('matches nothing for a tag no query has registered', async () => {
    const { api, queryClient } = setup();
    await queryClient.fetchQuery(api.queryOptions('get', '/users'));

    await api.invalidateTags(queryClient, ['users']);

    expect(
      queryClient.getQueryState(api.queryKey('get', '/users'))?.isInvalidated,
    ).toBe(false);
  });
});

describe('queryKey', () => {
  it('targets a cached query without a hand-built key factory', async () => {
    const { api, queryClient } = setup();
    await queryClient.fetchQuery(
      api.queryOptions('get', '/users/{id}', {
        params: { path: { id: 'u1' } },
      }),
    );

    expect(
      queryClient.getQueryData(
        api.queryKey('get', '/users/{id}', { params: { path: { id: 'u1' } } }),
      ),
    ).toEqual(ada);
  });

  it('prefix-matches every variant of an endpoint on [method, path]', async () => {
    const { api, queryClient } = setup();

    const first = api.queryOptions('get', '/users', {
      params: { query: { limit: 1 } },
    });
    const second = api.queryOptions('get', '/users', {
      params: { query: { limit: 2 } },
    });
    await queryClient.fetchQuery(first);
    await queryClient.fetchQuery(second);

    await queryClient.invalidateQueries({ queryKey: ['get', '/users'] });

    expect(queryClient.getQueryState(first.queryKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(second.queryKey)?.isInvalidated).toBe(
      true,
    );
  });
});

describe('middleware', () => {
  it('runs onion order: instance chain first, per-call chain innermost', async () => {
    const trace: string[] = [];

    const record =
      (name: string): QueryApiMiddleware =>
      async (ctx, next) => {
        trace.push(`enter:${name}`);
        const data = await next(ctx);
        trace.push(`exit:${name}`);
        return data;
      };

    const { api, queryClient } = setup({
      middleware: [record('outer'), record('inner')],
    });

    await queryClient.fetchQuery(
      api.queryOptions('get', '/users', undefined, {
        middleware: [record('call')],
      }),
    );

    expect(trace).toEqual([
      'enter:outer',
      'enter:inner',
      'enter:call',
      'exit:call',
      'exit:inner',
      'exit:outer',
    ]);
  });

  it('sees the operation it is wrapping', async () => {
    const seen: unknown[] = [];
    const { api, queryClient } = setup({
      middleware: [
        async (ctx, next) => {
          seen.push({
            method: ctx.method,
            path: ctx.path,
            operationType: ctx.operationType,
          });
          return await next();
        },
      ],
    });

    await queryClient.fetchQuery(
      api.queryOptions('get', '/users/{id}', {
        params: { path: { id: 'u1' } },
      }),
    );
    await new MutationObserver(
      queryClient,
      api.mutationOptions('post', '/users'),
    ).mutate({ body: { name: 'Grace' } });

    expect(seen).toEqual([
      { method: 'get', path: '/users/{id}', operationType: 'query' },
      { method: 'post', path: '/users', operationType: 'mutation' },
    ]);
  });

  it('can rewrite the request on the way in', async () => {
    const { api, queryClient, stub } = setup({
      middleware: [
        (ctx, next) =>
          next({
            ...ctx,
            init: { ...ctx.init, params: { query: { limit: 99 } } },
          }),
      ],
    });

    await queryClient.fetchQuery(api.queryOptions('get', '/users'));

    expect(stub.requests[0]?.url).toBe('/users?limit=99');
  });

  it('can replace the result on the way out', async () => {
    const { api, queryClient } = setup({
      middleware: [async (_ctx, next) => [...((await next()) as User[]), ada]],
    });

    await expect(
      queryClient.fetchQuery(api.queryOptions('get', '/users')),
    ).resolves.toEqual([ada, ada]);
  });
});

describe('createZodResponseMiddleware', () => {
  const document = {
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: { id: { type: 'string' }, name: { type: 'string' } },
          required: ['id', 'name'],
        },
      },
    },
  };

  it('passes a conforming body through untouched', async () => {
    const middleware = createZodResponseMiddleware({
      document,
      schemas: { 'get /users/{id}': 'User' },
    });
    const { api, queryClient } = setup({ middleware: [middleware] });

    const data = await queryClient.fetchQuery(
      api.queryOptions('get', '/users/{id}', {
        params: { path: { id: 'u1' } },
      }),
    );

    expect(data).toEqual(ada);
  });

  it('rejects a body that violates its component schema', async () => {
    const middleware = createZodResponseMiddleware({
      document,
      // /users returns an array, so validating it as a single User must fail.
      schemas: { 'get /users': 'User' },
    });
    const { api, queryClient } = setup({ middleware: [middleware] });

    const error = await queryClient
      .fetchQuery(api.queryOptions('get', '/users'))
      .catch((thrown: unknown) => thrown);

    expect((error as Error).name).toBe('ZodResponseValidationError');
    expect((error as Error).message).toContain('User validation');
  });

  it('reports instead of throwing when onInvalid is supplied', async () => {
    const onInvalid = vi.fn();
    const middleware = createZodResponseMiddleware({
      document,
      schemas: { 'get /users': 'User' },
      onInvalid,
    });
    const { api, queryClient } = setup({ middleware: [middleware] });

    await expect(
      queryClient.fetchQuery(api.queryOptions('get', '/users')),
    ).resolves.toEqual([ada]);
    expect(onInvalid).toHaveBeenCalledTimes(1);
    expect(onInvalid.mock.calls[0]?.[0].schemaName).toBe('User');
    expect(onInvalid.mock.calls[0]?.[0].issues.length).toBeGreaterThan(0);
  });

  it('skips operations with no mapped schema', async () => {
    const middleware = createZodResponseMiddleware({
      document,
      schemas: (ctx) => (ctx.path === '/never' ? 'User' : undefined),
    });
    const { api, queryClient } = setup({ middleware: [middleware] });

    await expect(
      queryClient.fetchQuery(api.queryOptions('get', '/users')),
    ).resolves.toEqual([ada]);
  });
});
