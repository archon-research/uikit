/**
 * Typed msw mocks keyed off a generated OpenAPI `paths` type — the same type
 * that drives `createApiClient` and `createQueryApi`, so handlers, params, and
 * fixture bodies are checked against one contract.
 *
 * Environment wiring lives behind subpath entries so neither environment's msw
 * import ends up in the other's bundle:
 *
 * - `@archon-research/http-client-msw/browser` — `setupMockWorker`
 * - `@archon-research/http-client-msw/node` — `setupMockServer`
 *
 * Nothing here references `msw/browser` or `msw/node`, so this entry stays
 * resolvable from either environment.
 */

export {
  createMockApi,
  type MockApi,
  type MockApiOptions,
  type MockHandler,
  type MockOriginMatching,
  type MockPathsFor,
  type MockRequestBodyFor,
  type MockRequestHandler,
  type MockResponseBodyFor,
  type MockResponseResolver,
  type MockResponseResolverInfo,
} from './mock-api.js';
export {
  isAbsoluteUrl,
  normalizeApiBaseUrl,
  resolveHandlerBase,
  resolveWorkerScriptUrl,
} from './base-url.js';
export {
  type MockResetCallback,
  type MockSetup,
  type MockSetupHandler,
  type MockSetupOptions,
  setupMocks,
} from './setup.js';
