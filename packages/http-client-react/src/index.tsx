import {
  queryOptions,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

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
  createZodResponseMiddleware,
  ZodResponseValidationError,
} from './zod-response.js';
export type {
  ResponseSchemaSource,
  ResponseValidationIssue,
  ZodResponseMiddlewareOptions,
} from './zod-response.js';

export const createQueryClient = () => new QueryClient();

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
