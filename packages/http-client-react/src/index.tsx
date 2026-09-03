import {
  queryOptions,
  type QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

import { createQueryClient } from './query-client.js';

export { createApiClient } from '@archon-research/http-client-core';
export type {
  ApiClient,
  ApiClientOptions,
  JsonSchema,
} from '@archon-research/http-client-core';

export { createQueryApi } from './query-api.js';
export type {
  MutationInvalidation,
  QueryApi,
  QueryApiCallOptions,
  QueryApiError,
  QueryApiKeyFn,
  QueryApiMutationCallOptions,
  QueryApiMutationMethod,
  QueryApiMutationOptionsFn,
  QueryApiOptions,
  QueryApiPaths,
  QueryApiQueryMethod,
  QueryApiQueryOptionsFn,
} from './query-api.js';

export { HttpRequestError, isHttpRequestError } from './errors.js';

export { composeMiddleware } from './middleware.js';
export type {
  QueryApiMiddleware,
  QueryApiNext,
  QueryApiOperationType,
  QueryApiRequestContext,
} from './middleware.js';

export {
  buildQueryApiKey,
  canonicalizeQueryKeyValue,
  operationToken,
  sanitizeQueryInit,
} from './query-key.js';
export type { QueryApiKey, SanitizedQueryInit } from './query-key.js';

export {
  createQueryClient,
  isRetryableError,
  isRetryableHttpStatus,
  shouldRetryRequest,
} from './query-client.js';

export {
  createZodResponseMiddleware,
  ZodResponseValidationError,
} from './zod-response.js';
export type {
  ResponseSchemaSource,
  ResponseValidationIssue,
  ZodResponseMiddlewareOptions,
} from './zod-response.js';

/**
 * The client `HttpProvider` falls back to when the app does not pass one. A
 * single module-scoped instance, so every consumer of the fallback shares one
 * cache — but prefer creating it in the app: the fallback cannot be reset
 * between tests and cannot be reached for `setQueryData` before render.
 */
const defaultQueryClient = createQueryClient();

export type HttpProviderProps = PropsWithChildren<{
  client?: QueryClient;
}>;

export function HttpProvider({ client, children }: HttpProviderProps) {
  return (
    <QueryClientProvider client={client ?? defaultQueryClient}>
      {children}
    </QueryClientProvider>
  );
}

/**
 * @deprecated Use `createQueryApi(client).queryOptions(method, path, init)`
 * instead: it derives the query key from the operation, types the result from
 * the OpenAPI response, and rejects with a typed error. This shim keeps working
 * for the hand-written query keys that predate it.
 */
export function createQueryOptions<TData>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<TData>,
) {
  return queryOptions({ queryKey, queryFn });
}
