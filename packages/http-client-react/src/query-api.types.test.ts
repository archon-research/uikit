import {
  type ApiClient,
  createApiClient,
} from '@archon-research/http-client-core';
import { useQuery } from '@tanstack/react-query';
import type { DataTag, QueryClient } from '@tanstack/react-query';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { type HttpRequestError, isHttpRequestError } from './errors.js';
import { createQueryApi } from './query-api.js';
import type { QueryApi, QueryApiPaths } from './query-api.js';
import type { ApiFault, TestPaths, User } from './test-fixtures.js';

/**
 * Type-level coverage of the inference the whole design rests on: methods,
 * paths, params, request bodies, and response types all come off the generated
 * `TPaths` type, and the single cast inside `createQueryApi` still lines up with
 * the generic surface it claims.
 *
 * `expectTypeOf` and `@ts-expect-error` are checked by `npm run type:check`, so
 * the assertions live in functions that are never called — several of them would
 * throw or issue requests if they ran, and one calls `useQuery` outside a React
 * render purely to borrow its overload resolution.
 */

const client = createApiClient<TestPaths>('https://api.test');
const api = createQueryApi(client, { tags: ['users', 'user'] });

/**
 * Stands in for `useQuery`, reading the data and error types back out of the
 * branded query key so both can be asserted without rendering a hook.
 */
declare function readTags<TData, TError>(options: {
  queryKey: DataTag<readonly unknown[], TData, TError>;
}): { data: TData; error: TError };

type ResolvedQueryFn<
  TOptions extends { queryFn: (...args: never[]) => unknown },
> = Awaited<ReturnType<TOptions['queryFn']>>;

describe('createQueryApi — inference', () => {
  // A real assertion rather than a placeholder: the file's whole premise is
  // that this api instance was constructed, and everything asserted below is
  // about the options it builds.
  it('builds options whose key is the operation', () => {
    expect(api.queryOptions('get', '/users').queryKey).toEqual([
      'get',
      '/users',
      {},
    ]);
  });
});

export function typeAssertions(): void {
  // The tag vocabulary narrows `TTag` — no explicit type argument needed.
  expectTypeOf(api.tagFilter).parameter(0).toEqualTypeOf<'users' | 'user'>();
  expectTypeOf(api.taggedEndpoints)
    .parameter(0)
    .toEqualTypeOf<'users' | 'user'>();

  // Response data comes from the operation's 2xx response.
  const listOptions = api.queryOptions('get', '/users', {
    params: { query: { limit: 10 } },
  });
  expectTypeOf<ResolvedQueryFn<typeof listOptions>>().toEqualTypeOf<User[]>();

  const listResult = readTags(listOptions);
  expectTypeOf(listResult.data).toEqualTypeOf<User[]>();
  expectTypeOf(listResult.error).toEqualTypeOf<
    HttpRequestError<ApiFault> | Error
  >();

  // The derived key is `[method, path, sanitized(init)]`.
  expectTypeOf(listOptions.queryKey).toExtend<
    readonly ['get', '/users', { query?: Record<string, unknown> }]
  >();

  const detailOptions = api.queryOptions('get', '/users/{id}', {
    params: { path: { id: 'u1' } },
  });
  expectTypeOf<ResolvedQueryFn<typeof detailOptions>>().toEqualTypeOf<User>();
  expectTypeOf(readTags(detailOptions).error).toEqualTypeOf<
    HttpRequestError<ApiFault> | Error
  >();

  // Narrowing needs no body type parameter: the guard filters the declared
  // union, so the operation's own error body survives it — and stays optional,
  // because a failure need not carry a body at all.
  const failure = readTags(detailOptions).error;
  if (isHttpRequestError(failure)) {
    expectTypeOf(failure.body).toEqualTypeOf<ApiFault | undefined>();
  }

  // A `catch` binding declares nothing, so the body stays `unknown` — the guard
  // has no type parameter with which to claim otherwise.
  const caught = failure as unknown;
  if (isHttpRequestError(caught)) {
    expectTypeOf(caught.status).toEqualTypeOf<number>();
    expectTypeOf(caught.body).toEqualTypeOf<unknown>();
  }

  // `select` retypes what a component reads without losing the fetched type.
  const selectedOptions = api.queryOptions('get', '/users', undefined, {
    select: (users) => users.length,
  });
  expectTypeOf(selectedOptions.select).parameter(0).toEqualTypeOf<User[]>();

  // The assertion that matters: the options' `TData` is the *selected* type, so
  // this is what a component reads. Asserted through the real `useQuery` rather
  // than a stand-in, since matching its overload resolution is the point.
  expectTypeOf(useQuery(selectedOptions).data).toEqualTypeOf<
    number | undefined
  >();
  expectTypeOf(useQuery(listOptions).data).toEqualTypeOf<User[] | undefined>();

  // And the key's brand still carries the *fetched* type, not the selected one:
  // `getQueryData` on this key hands back what the endpoint returned.
  expectTypeOf(readTags(selectedOptions).data).toEqualTypeOf<User[]>();

  // HEAD is in the query method union, so a declared HEAD operation has to be
  // reachable through it — and only on the path that declares one.
  const headOptions = api.queryOptions('head', '/users', {
    params: { query: { search: 'ada' } },
  });
  expectTypeOf(headOptions.queryKey).toExtend<
    readonly ['head', '/users', { query?: Record<string, unknown> }]
  >();

  // @ts-expect-error — /users/{id} declares no HEAD operation
  api.queryOptions('head', '/users/{id}', { params: { path: { id: 'u1' } } });

  // @ts-expect-error — `params.path.id` is required by the operation
  api.queryOptions('get', '/users/{id}');

  // @ts-expect-error — `id` must be a string
  api.queryOptions('get', '/users/{id}', { params: { path: { id: 7 } } });

  // @ts-expect-error — the path is not in TestPaths
  api.queryOptions('get', '/unknown');

  // @ts-expect-error — /users has no DELETE operation
  api.queryOptions('delete', '/users');

  // @ts-expect-error — mutating methods do not belong on queryOptions
  api.queryOptions('post', '/users');

  // @ts-expect-error — 'orders' is not in the declared tag vocabulary
  api.queryOptions('get', '/users', undefined, { tags: ['orders'] });

  // Mutations: variables are the operation's init, data is the 2xx body.
  const createOptions = api.mutationOptions('post', '/users', {
    invalidates: ['users'],
  });
  expectTypeOf(createOptions.mutationFn)
    .parameter(0)
    .toExtend<{ body: { name: string } }>();
  expectTypeOf<
    Awaited<ReturnType<typeof createOptions.mutationFn>>
  >().toEqualTypeOf<User>();
  expectTypeOf(createOptions.mutationKey).toEqualTypeOf<
    readonly ['post', '/users']
  >();

  // A tag-producing callback sees the mutation's own result.
  api.mutationOptions('post', '/users', {
    invalidates: [
      (created) => {
        expectTypeOf(created).toEqualTypeOf<User>();
        return ['user', 'users'];
      },
    ],
  });

  // @ts-expect-error — 'orders' is not in the declared tag vocabulary
  api.mutationOptions('post', '/users', { invalidates: ['orders'] });

  // @ts-expect-error — read methods do not belong on mutationOptions
  api.mutationOptions('get', '/users');

  const deleteOptions = api.mutationOptions('delete', '/users/{id}');
  expectTypeOf(deleteOptions.mutationFn)
    .parameter(0)
    .toExtend<{ params: { path: { id: string } } }>();

  // The query key helper is branded with the same data and error types.
  expectTypeOf(
    readTags({ queryKey: api.queryKey('get', '/users') }).data,
  ).toEqualTypeOf<User[]>();

  // `QueryApiPaths` constrains `createQueryApi` itself, not just the option
  // types it returns, so a paths type that is not a map of path → operations is
  // rejected at the api's own signature.
  const notPathsClient = {} as ApiClient<{ '/users': string }>;
  // @ts-expect-error — `string` is not a map of HTTP method to operation
  createQueryApi<{ '/users': string }>(notPathsClient);

  // Inferring the same bad paths type off the client is the case the constraint
  // cannot reject: inference finds no candidate and falls back to the
  // constraint, so the api is typed `QueryApi<QueryApiPaths>` and it is the
  // calls on it that fail, not the construction.
  expectTypeOf(createQueryApi(notPathsClient)).toEqualTypeOf<
    QueryApi<QueryApiPaths>
  >();
}

/**
 * An operation whose init is entirely optional must be callable with two
 * arguments — including in a contextually typed position, which is where the
 * `NoInfer` wrappers on the return types earn their keep.
 */
export function optionalInitArity(queryClient: QueryClient): void {
  api.queryKey('get', '/users');
  api.queryOptions('get', '/users');
  api.mutationOptions('post', '/users');

  const key: readonly unknown[] = api.queryKey('get', '/users');
  void key;

  void queryClient.invalidateQueries({
    queryKey: api.queryKey('get', '/users'),
  });
  void queryClient.getQueryState(api.queryKey('get', '/users'));
  void queryClient.fetchQuery(api.queryOptions('get', '/users'));
}
