import { QueryClient, type QueryClientConfig } from '@tanstack/react-query';

import { isHttpRequestError } from './errors.js';
import { isZodResponseValidationError } from './zod-response.js';

/**
 * The 4xx statuses that describe a *transient* condition rather than a bad
 * request. Everything else in the 4xx range says the request itself is wrong —
 * a 401, a 404, a 422 — and repeating it unchanged produces the same answer
 * more slowly.
 *
 * - **408 Request Timeout** — the server gave up waiting for the request.
 * - **425 Too Early** — a replay-risk refusal on an early-data TLS connection;
 *   the retry goes out on the completed handshake.
 * - **429 Too Many Requests** — rate limited, which is by definition temporary.
 */
const RETRYABLE_CLIENT_STATUSES: ReadonlySet<number> = new Set([408, 425, 429]);

/**
 * Retries before a query is reported as failed. With react-query's default
 * exponential `retryDelay` (1s, then 2s) this puts an error on screen about
 * three seconds after the first failure — react-query's own default of 3 takes
 * roughly seven, which is a long time for a panel to sit in a pending state
 * over a fault that is not going to clear.
 */
const DEFAULT_MAX_RETRIES = 2;

/**
 * Whether a response status is worth asking for again.
 *
 * 5xx and the three transient 4xx statuses are; every other 4xx is not, and
 * neither is anything below 400 — a 304 reaching the error path is a caching
 * problem, not a flaky one.
 */
export function isRetryableHttpStatus(status: number): boolean {
  return status >= 500 || RETRYABLE_CLIENT_STATUSES.has(status);
}

/**
 * Whether a rejected query or mutation is worth retrying.
 *
 * A rejection carrying no status is retried by default: a DNS failure, a
 * dropped connection, a CORS refusal, an abort, or a middleware that threw
 * leaves no evidence beyond the request not completing, and treating an
 * unrecognised rejection as fatal would make a single dropped socket a visible
 * error.
 *
 * `ZodResponseValidationError` is the exception, and the reason this is not a
 * bare `isHttpRequestError` check. It carries no status because
 * `createZodResponseMiddleware` rejects *after* a 2xx arrived and parsed — the
 * request completed, and the body it returned does not match the schema. That
 * verdict is a property of the deployed server, so asking again produces the
 * same mismatch two round trips later: exactly the cost this module's `retry`
 * exists to avoid on a 422.
 *
 * Both checks narrow on `name` rather than `instanceof`, so they still hold
 * when a consumer's module graph contains two copies of this package.
 *
 * Exported so a consumer can keep this status policy while changing the
 * attempt count: `retry: (count, error) => count < 5 && isRetryableError(error)`.
 */
export function isRetryableError(error: unknown): boolean {
  if (isHttpRequestError(error)) return isRetryableHttpStatus(error.status);

  return !isZodResponseValidationError(error);
}

/**
 * The retry predicate {@link createQueryClient} installs, in react-query's own
 * `(failureCount, error)` shape. `failureCount` is the number of failures
 * *before* this attempt, so it is 0 on the first rejection.
 *
 * Exported so a consumer can wrap it rather than restate it — dropping an
 * application-specific error out of the policy, say:
 *
 * ```ts
 * retry: (count, error) =>
 *   isSessionExpired(error) ? false : shouldRetryRequest(count, error)
 * ```
 */
export function shouldRetryRequest(
  failureCount: number,
  error: unknown,
): boolean {
  return failureCount < DEFAULT_MAX_RETRIES && isRetryableError(error);
}

/**
 * A `QueryClient` with defaults suited to a data-dense application, in place of
 * react-query's, which are tuned for a document-shaped app:
 *
 * - **`refetchOnWindowFocus: false`.** Alt-tabbing back to a dashboard should
 *   not reload every panel under the cursor. Freshness is the business of
 *   `staleTime` and explicit invalidation, both of which the app controls.
 * - **A status-aware `retry`** — see {@link shouldRetryRequest}. React-query
 *   retries every rejection three times, so a 422 costs three round trips to
 *   report a validation error the server already decided on the first.
 *
 * Mutations are deliberately left un-retried — react-query's default, and the
 * right one, because a POST that reached the server may well have applied
 * before the failure and this package cannot tell which.
 *
 * Everything else is left at react-query's default deliberately, `staleTime`
 * most of all: how long a given screen may show a stale number is a product
 * decision, and a package-level guess would be wrong quietly.
 *
 * `config` is react-query's own `QueryClientConfig` and every field of it wins.
 * The merge is per-option rather than wholesale, so overriding one default
 * keeps the others:
 *
 * ```ts
 * // Keeps `refetchOnWindowFocus: false`; replaces only the retry policy.
 * const queryClient = createQueryClient({
 *   defaultOptions: { queries: { retry: 5 } },
 * });
 * ```
 */
export function createQueryClient(config: QueryClientConfig = {}): QueryClient {
  const { defaultOptions, ...rest } = config;

  return new QueryClient({
    ...rest,
    defaultOptions: {
      ...defaultOptions,
      queries: {
        refetchOnWindowFocus: false,
        retry: shouldRetryRequest,
        // Spread last: a caller's `queries` option replaces the default of the
        // same name and leaves the rest standing.
        ...defaultOptions?.queries,
      },
    },
  });
}
