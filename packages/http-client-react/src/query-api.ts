import type {
  ApiClient,
  FetchResponse,
  HttpMethod,
  MaybeOptionalInit,
  MediaType,
  PathsWithMethod,
  RequiredKeysOf,
} from '@archon-research/http-client-core';
import type {
  DataTag,
  QueryClient,
  QueryFilters,
  QueryKey,
  SkipToken,
  UseMutationOptions,
  UseQueryOptions,
} from '@tanstack/react-query';

import { HttpRequestError } from './errors.js';
import {
  composeMiddleware,
  type QueryApiMiddleware,
  type QueryApiOperationType,
  type QueryApiRequestContext,
} from './middleware.js';
import { buildQueryApiKey, type QueryApiKey } from './query-key.js';
import { createTagRegistry } from './tags.js';

/**
 * The shape an `openapi-typescript`-generated `paths` type has: every path maps
 * to an object with a key per HTTP method (`never` for the ones the endpoint
 * does not implement). Indexing `TPaths[TPath][TMethod]` needs this.
 */
export type QueryApiPaths = Record<string, Record<HttpMethod, {}>>;

/**
 * Methods `queryOptions` accepts: the safe, bodyless, cacheable ones. A
 * POST-backed read (`POST /search`) is deliberately out of v1 — see DESIGN.md.
 */
export type QueryApiQueryMethod = Extract<HttpMethod, 'get' | 'head'>;

/** Methods `mutationOptions` accepts. */
export type QueryApiMutationMethod = Extract<
  HttpMethod,
  'post' | 'put' | 'patch' | 'delete'
>;

/**
 * What a failed query or mutation rejects with. A request that reached the
 * server rejects with {@link HttpRequestError} (status plus parsed error body);
 * a transport failure or a middleware — response validation, for instance —
 * rejects with whatever it threw. Narrow with `isHttpRequestError` before
 * reading `status`.
 */
export type QueryApiError<TErrorBody> = HttpRequestError<TErrorBody> | Error;

type InitWithUnknowns<TInit> = TInit & { [key: string]: unknown };

type InferSelectReturnType<TData, TSelect> = TSelect extends (
  data: TData,
) => infer TSelected
  ? TSelected
  : TData;

/** Per-call options for `queryOptions`: react-query's, plus cache tags. */
export type QueryApiCallOptions<
  TQueryFnData,
  TError,
  TData,
  TKey extends QueryKey,
  TTag extends string,
> = Omit<
  UseQueryOptions<TQueryFnData, TError, TData, TKey>,
  'queryKey' | 'queryFn'
> & {
  /** Tags this endpoint belongs to, for mutation-driven invalidation. */
  tags?: readonly TTag[];
  /** Middleware appended to the instance chain for this call only. */
  middleware?: readonly QueryApiMiddleware[];
};

/**
 * A tag to invalidate on mutation success, either fixed or derived from the
 * mutation's own result and variables.
 */
export type MutationInvalidation<TTag extends string, TData, TVariables> =
  | TTag
  | ((data: TData, variables: TVariables) => TTag | readonly TTag[]);

/** Per-call options for `mutationOptions`: react-query's, plus `invalidates`. */
export type QueryApiMutationCallOptions<
  TData,
  TError,
  TVariables,
  TOnMutateResult,
  TTag extends string,
> = Omit<
  UseMutationOptions<TData, TError, TVariables, TOnMutateResult>,
  'mutationKey' | 'mutationFn'
> & {
  invalidates?: readonly MutationInvalidation<TTag, TData, TVariables>[];
  /** Middleware appended to the instance chain for this call only. */
  middleware?: readonly QueryApiMiddleware[];
};

export type QueryApiKeyFn<
  TPaths extends QueryApiPaths,
  TMedia extends MediaType,
> = <
  TMethod extends QueryApiQueryMethod,
  TPath extends PathsWithMethod<TPaths, TMethod>,
  TInit extends MaybeOptionalInit<TPaths[TPath], TMethod>,
  TResponse extends Required<
    FetchResponse<TPaths[TPath][TMethod], TInit, TMedia>
  >,
>(
  method: TMethod,
  path: TPath,
  ...[init]: RequiredKeysOf<TInit> extends never
    ? [init?: InitWithUnknowns<TInit>]
    : [init: InitWithUnknowns<TInit>]
  // `NoInfer` matters here: without it, a contextual type on the result — the
  // `queryKey` property of an `invalidateQueries` filter, say — becomes an
  // inference site for `TResponse`, which leaves `TInit` unresolved and makes
  // TypeScript demand the optional `init` argument.
) => NoInfer<
  DataTag<
    QueryApiKey<TMethod, TPath>,
    TResponse['data'],
    QueryApiError<TResponse['error']>
  >
>;

export type QueryApiQueryOptionsFn<
  TPaths extends QueryApiPaths,
  TTag extends string,
  TMedia extends MediaType,
> = <
  TMethod extends QueryApiQueryMethod,
  TPath extends PathsWithMethod<TPaths, TMethod>,
  TInit extends MaybeOptionalInit<TPaths[TPath], TMethod>,
  // `Required` here so the option types below never repeat `NonNullable`.
  TResponse extends Required<
    FetchResponse<TPaths[TPath][TMethod], TInit, TMedia>
  >,
  TOptions extends QueryApiCallOptions<
    TResponse['data'],
    QueryApiError<TResponse['error']>,
    InferSelectReturnType<TResponse['data'], TOptions['select']>,
    QueryApiKey<TMethod, TPath>,
    TTag
  >,
>(
  method: TMethod,
  path: TPath,
  ...[init, options]: RequiredKeysOf<TInit> extends never
    ? [init?: InitWithUnknowns<TInit>, options?: TOptions]
    : [init: InitWithUnknowns<TInit>, options?: TOptions]
) => NoInfer<
  Omit<
    UseQueryOptions<
      TResponse['data'],
      QueryApiError<TResponse['error']>,
      InferSelectReturnType<TResponse['data'], TOptions['select']>,
      QueryApiKey<TMethod, TPath>
    >,
    'queryKey' | 'queryFn'
  > & {
    queryKey: DataTag<
      QueryApiKey<TMethod, TPath>,
      TResponse['data'],
      QueryApiError<TResponse['error']>
    >;
    queryFn: Exclude<
      UseQueryOptions<
        TResponse['data'],
        QueryApiError<TResponse['error']>,
        InferSelectReturnType<TResponse['data'], TOptions['select']>,
        QueryApiKey<TMethod, TPath>
      >['queryFn'],
      SkipToken | undefined
    >;
  }
>;

export type QueryApiMutationOptionsFn<
  TPaths extends QueryApiPaths,
  TTag extends string,
  TMedia extends MediaType,
> = <
  TMethod extends QueryApiMutationMethod,
  TPath extends PathsWithMethod<TPaths, TMethod>,
  TInit extends MaybeOptionalInit<TPaths[TPath], TMethod>,
  TResponse extends Required<
    FetchResponse<TPaths[TPath][TMethod], TInit, TMedia>
  >,
  TOnMutateResult = unknown,
>(
  method: TMethod,
  path: TPath,
  options?: QueryApiMutationCallOptions<
    TResponse['data'],
    QueryApiError<TResponse['error']>,
    InitWithUnknowns<TInit>,
    TOnMutateResult,
    TTag
  >,
) => NoInfer<
  Omit<
    UseMutationOptions<
      TResponse['data'],
      QueryApiError<TResponse['error']>,
      InitWithUnknowns<TInit>,
      TOnMutateResult
    >,
    'mutationKey' | 'mutationFn'
  > & {
    mutationKey: readonly [method: TMethod, path: TPath];
    mutationFn: NonNullable<
      UseMutationOptions<
        TResponse['data'],
        QueryApiError<TResponse['error']>,
        InitWithUnknowns<TInit>,
        TOnMutateResult
      >['mutationFn']
    >;
  }
>;

/** Instance-level configuration for {@link createQueryApi}. */
export type QueryApiOptions<TTag extends string> = {
  /**
   * The tag vocabulary. Passing it both infers `TTag` (so `tags` and
   * `invalidates` are checked against a closed set) and makes an unknown tag
   * throw at runtime, which is what catches typos from untyped call sites.
   */
  tags?: readonly TTag[];
  /** Middleware applied to every request from this instance, outermost first. */
  middleware?: readonly QueryApiMiddleware[];
};

export type QueryApi<
  TPaths extends QueryApiPaths,
  TTag extends string = string,
  TMedia extends MediaType = MediaType,
> = {
  /**
   * The derived key for an operation, for targeting `getQueryData`,
   * `setQueryData`, or `invalidateQueries` without a hand-built key factory.
   * Slice it to `[method, path]` to target every cached variant of an endpoint.
   */
  queryKey: QueryApiKeyFn<TPaths, TMedia>;
  queryOptions: QueryApiQueryOptionsFn<TPaths, TTag, TMedia>;
  mutationOptions: QueryApiMutationOptionsFn<TPaths, TTag, TMedia>;
  /** A react-query filter matching every query registered under `tag`. */
  tagFilter: (tag: TTag) => QueryFilters;
  invalidateTags: (client: QueryClient, tags: readonly TTag[]) => Promise<void>;
  /** The `${method} ${path}` tokens currently registered under `tag`. */
  taggedEndpoints: (tag: TTag) => readonly string[];
};

type LooseFetchResult = {
  data?: unknown;
  error?: unknown;
  response: Response;
};

type LooseClientMethod = (
  path: string,
  init?: Record<string, unknown>,
) => Promise<LooseFetchResult>;

/**
 * Binds a TanStack Query surface to an `openapi-fetch` client.
 *
 * The generated `TPaths` type is the only endpoint definition: methods, paths,
 * params, request bodies, and response types are all read off it, and both
 * `TPaths` and the tag vocabulary are inferred from the arguments — prefer
 * `createQueryApi(client, { tags: [...] })` over passing type arguments
 * explicitly, since naming one disables inference for the rest.
 */
export function createQueryApi<
  // Constrained to `{}` rather than `QueryApiPaths` on purpose:
  // `openapi-typescript` emits absent operations as `put?: never`, which no
  // `Record<HttpMethod, {}>` accepts. `openapi-fetch`'s own `createClient` makes
  // the same trade — the tighter shape is asserted inside the option types,
  // where only the operations that do exist are indexed.
  TPaths extends {},
  TTag extends string = string,
  TMedia extends MediaType = MediaType,
>(
  client: ApiClient<TPaths, TMedia>,
  options: QueryApiOptions<TTag> = {},
): QueryApi<TPaths, TTag, TMedia> {
  const registry = createTagRegistry(options.tags);
  const instanceMiddleware = options.middleware ?? [];
  const methods = client as unknown as Record<string, LooseClientMethod>;

  const send = async (ctx: QueryApiRequestContext): Promise<unknown> => {
    const method = ctx.method.toUpperCase();
    const call = methods[method];
    if (!call) {
      throw new Error(`http-client-react: client has no ${method} method`);
    }

    const { data, error, response } = await call(ctx.path, ctx.init);

    if (!response.ok || error !== undefined) {
      throw new HttpRequestError({
        method: ctx.method,
        path: ctx.path,
        body: error,
        response,
      });
    }

    // A HEAD response has no body by definition, so `openapi-fetch` resolves
    // `data: undefined` whatever the status and whatever `Content-Length`
    // claims — and it claims the size the matching GET would have returned, so
    // the emptiness checks below do not catch it. react-query rejects
    // `undefined` as query data.
    if (method === 'HEAD') return data ?? null;

    // Same conversion for the other two ways a 2xx legitimately has no body.
    if (
      response.status === 204 ||
      response.headers.get('Content-Length') === '0'
    ) {
      return data ?? null;
    }

    return data;
  };

  const request = (
    operationType: QueryApiOperationType,
    method: string,
    path: string,
    init: Record<string, unknown> | undefined,
    callMiddleware: readonly QueryApiMiddleware[] | undefined,
  ): Promise<unknown> => {
    const chain = callMiddleware?.length
      ? [...instanceMiddleware, ...callMiddleware]
      : instanceMiddleware;

    return composeMiddleware(
      chain,
      send,
    )({
      method,
      path,
      operationType,
      init,
    });
  };

  const tagFilter = (tag: TTag): QueryFilters => {
    registry.assertKnown(tag);
    return { predicate: (query) => registry.matches(tag, query.queryKey) };
  };

  const invalidateTags = async (
    client_: QueryClient,
    tags: readonly TTag[],
  ): Promise<void> => {
    await Promise.all(
      tags.map((tag) => client_.invalidateQueries(tagFilter(tag))),
    );
  };

  /**
   * Runs after the mutation has already succeeded, which is what makes the
   * asymmetry below the right one: a literal tag was checked when
   * `mutationOptions` was called, so it can still throw; a tag a callback
   * derives from the result can only be checked here, and throwing here would
   * turn a successful mutation into a failed one and skip the caller's own
   * `onSuccess`. So an unknown derived tag is warned about and dropped.
   */
  const resolveInvalidations = (
    invalidates: readonly MutationInvalidation<TTag, never, never>[],
    data: unknown,
    variables: unknown,
  ): readonly TTag[] => {
    const resolved = new Set<TTag>();

    for (const entry of invalidates) {
      if (typeof entry !== 'function') {
        resolved.add(entry);
        continue;
      }

      const produced = (
        entry as (d: unknown, v: unknown) => TTag | readonly TTag[]
      )(data, variables);

      for (const tag of typeof produced === 'string' ? [produced] : produced) {
        if (registry.acceptOrWarn(tag)) resolved.add(tag);
      }
    }

    return [...resolved];
  };

  /**
   * The public surface is the generic type above; the implementation is written
   * against loose types and cast once, here. `query-api.types.test.ts` is what
   * holds the two in agreement.
   */
  const api = {
    queryKey: (method: string, path: string, init?: Record<string, unknown>) =>
      buildQueryApiKey(method, path, init),

    queryOptions: (
      method: string,
      path: string,
      init?: Record<string, unknown>,
      callOptions?: QueryApiCallOptions<
        unknown,
        Error,
        unknown,
        QueryKey,
        TTag
      >,
    ) => {
      const { tags, middleware, ...queryRest } = callOptions ?? {};

      for (const tag of tags ?? []) registry.register(tag, method, path);

      return {
        ...queryRest,
        queryKey: buildQueryApiKey(method, path, init),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          request('query', method, path, { ...init, signal }, middleware),
      };
    },

    mutationOptions: (
      method: string,
      path: string,
      callOptions?: QueryApiMutationCallOptions<
        never,
        Error,
        never,
        unknown,
        TTag
      >,
    ) => {
      const { invalidates, middleware, onSuccess, ...mutationRest } =
        callOptions ?? {};

      for (const entry of invalidates ?? []) {
        if (typeof entry === 'string') registry.assertKnown(entry);
      }

      return {
        ...mutationRest,
        mutationKey: [method, path],
        mutationFn: (variables?: Record<string, unknown>) =>
          request('mutation', method, path, variables, middleware),
        onSuccess: async (
          data: never,
          variables: never,
          onMutateResult: unknown,
          context: { client: QueryClient },
        ) => {
          if (invalidates?.length) {
            await invalidateTags(
              context.client,
              resolveInvalidations(invalidates, data, variables),
            );
          }

          return await onSuccess?.(
            data,
            variables,
            onMutateResult as never,
            context as never,
          );
        },
      };
    },

    tagFilter,
    invalidateTags,
    taggedEndpoints: registry.endpoints,
  };

  return api as unknown as QueryApi<TPaths, TTag, TMedia>;
}
