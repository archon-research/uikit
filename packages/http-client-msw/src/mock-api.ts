import { createOpenApiHttp, type OpenApiHttpHandlers } from 'openapi-msw';

import { type MockOriginMatching, resolveHandlerBase } from './base-url.js';

/**
 * The msw handler types this package's surface is expressed in. They are
 * re-exported so a consumer writing a helper around a resolver types against
 * the copy of msw this package resolves, rather than importing msw types in one
 * file and ours in another.
 */
export type {
  HttpHandler as MockHandler,
  RequestHandler as MockRequestHandler,
} from 'msw';
export type { MockOriginMatching } from './base-url.js';
export type {
  ResponseResolver as MockResponseResolver,
  ResponseResolverInfo as MockResponseResolverInfo,
} from 'openapi-msw';
export type {
  PathsFor as MockPathsFor,
  RequestBodyFor as MockRequestBodyFor,
  ResponseBodyFor as MockResponseBodyFor,
} from 'openapi-msw';

export type MockApiOptions = {
  /**
   * Prepended to every handler path, for an API mounted under a prefix. Given
   * `'/api'`, a handler declared on `/things/{id}` matches `/api/things/:id`.
   * Pass the same value the app passes to `createApiClient`. A trailing slash is
   * tolerated.
   */
  baseUrl?: string;
  /**
   * How an origin-relative `baseUrl` is matched.
   *
   * - `'any'` (default) prefixes handler paths with msw's `*` origin wildcard, so
   *   one handler array matches both the relative request a browser app makes
   *   and the absolute URL a node test has to issue. That is what makes the same
   *   mocks reusable across dev, vitest, and Playwright.
   * - `'exact'` leaves paths relative: same-origin matching only, and a node
   *   test then needs an absolute `baseUrl` of its own.
   *
   * An absolute `baseUrl` already pins the origin, so this does not apply to
   * one.
   */
  origin?: MockOriginMatching;
};

/**
 * A typed handler factory per HTTP method, plus `untyped` — msw's own `http`
 * object, for the rare route that is not in the OpenAPI document at all (an
 * auth callback on another host, say).
 */
export type MockApi<TPaths extends {}> = OpenApiHttpHandlers<TPaths>;

/**
 * Creates typed msw request-handler factories bound to a generated OpenAPI
 * `paths` type.
 *
 * The generated `TPaths` is the only endpoint definition: which methods exist on
 * which paths, what path and query params they take, and what body each status
 * may return are all read off it. A handler for a path the API does not have, or
 * one that answers with a body the operation does not declare, fails to compile
 * — which is the whole point of the layer, since a fixture that silently drifts
 * from the contract makes every test that depends on it a false pass.
 *
 * `TPaths` must be passed explicitly; there is no value argument to infer it
 * from.
 *
 * ```ts
 * const mock = createMockApi<paths>({ baseUrl: '/api' });
 *
 * const handlers = [
 *   mock.get('/things/{id}', ({ params, response }) =>
 *     response(200).json({ id: params.id, name: 'Thing' }),
 *   ),
 *   mock.get('/things', ({ response }) => response(500).json({ message: 'nope' })),
 * ];
 * ```
 */
export function createMockApi<TPaths extends {}>(
  options: MockApiOptions = {},
): MockApi<TPaths> {
  return createOpenApiHttp<TPaths>({
    baseUrl: resolveHandlerBase(options.baseUrl, options.origin ?? 'any'),
  });
}
