import {
  environmentManager,
  QueryCache,
  QueryClient,
  type QueryClientConfig,
  QueryObserver,
} from '@tanstack/react-query';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { HttpRequestError } from './errors.js';
import {
  createQueryClient,
  isRetryableError,
  isRetryableHttpStatus,
  shouldRetryRequest,
} from './query-client.js';
import { ZodResponseValidationError } from './zod-response.js';

/** An `HttpRequestError` as `createQueryApi` would build it for `status`. */
function httpError(status: number): HttpRequestError {
  return new HttpRequestError({
    method: 'get',
    path: '/users',
    body: undefined,
    response: new Response(null, { status }),
  });
}

/** A `ZodResponseValidationError` as the zod middleware would build it. */
function validationError(): ZodResponseValidationError {
  return new ZodResponseValidationError({
    method: 'get',
    path: '/users/{id}',
    schemaName: 'User',
    issues: [{ path: 'name', message: 'expected string, received undefined' }],
  });
}

describe('isRetryableHttpStatus', () => {
  // The four names below are the whole policy; the table specs under
  // `shouldRetryRequest` exercise it through the exported predicate.
  it.for([408, 425, 429])('retries the transient 4xx %i', (status) => {
    expect(isRetryableHttpStatus(status)).toBe(true);
  });

  it.for([400, 401, 403, 404, 409, 410, 418, 422, 451, 499])(
    'does not retry the client fault %i',
    (status) => {
      expect(isRetryableHttpStatus(status)).toBe(false);
    },
  );

  it.for([500, 502, 503, 504, 599])('retries the server fault %i', (status) => {
    expect(isRetryableHttpStatus(status)).toBe(true);
  });

  it.for([200, 204, 301, 304])(
    'does not retry the sub-400 status %i',
    (status) => {
      expect(isRetryableHttpStatus(status)).toBe(false);
    },
  );
});

describe('isRetryableError', () => {
  it('reads the status off an HttpRequestError', () => {
    expect(isRetryableError(httpError(429))).toBe(true);
    expect(isRetryableError(httpError(422))).toBe(false);
  });

  it('retries a rejection that never reached a status', () => {
    // A dropped connection, a CORS refusal, or a middleware that threw: the
    // only evidence is that the request did not complete.
    expect(isRetryableError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isRetryableError(new Error('response validation failed'))).toBe(
      true,
    );
    expect(isRetryableError('not an error at all')).toBe(true);
  });

  it('narrows on `name`, not `instanceof`', () => {
    // Two copies of this package in one module graph produce an error that is
    // not `instanceof` the class this predicate closed over.
    const foreign = Object.assign(new Error('HTTP 404'), {
      name: 'HttpRequestError',
      status: 404,
    });

    expect(isRetryableError(foreign)).toBe(false);
  });

  it('does not retry a body that failed response validation', () => {
    // The one rejection without a status that still means the request
    // completed: the middleware rejects after a 2xx arrived and parsed.
    expect(isRetryableError(validationError())).toBe(false);
  });

  it('narrows the validation error on `name` too', () => {
    const foreign = Object.assign(new Error('User validation failed'), {
      name: 'ZodResponseValidationError',
    });

    expect(isRetryableError(foreign)).toBe(false);
  });
});

describe('shouldRetryRequest', () => {
  it('allows two retries, then stops', () => {
    // `failureCount` is the number of failures *before* this attempt, so the
    // first rejection arrives as 0. Two `true`s means three attempts total.
    expect(shouldRetryRequest(0, httpError(503))).toBe(true);
    expect(shouldRetryRequest(1, httpError(503))).toBe(true);
    expect(shouldRetryRequest(2, httpError(503))).toBe(false);
  });

  it('stops on a client fault at the first failure', () => {
    expect(shouldRetryRequest(0, httpError(404))).toBe(false);
  });
});

describe('createQueryClient', () => {
  it('installs the dashboard defaults', () => {
    const queries = createQueryClient().getDefaultOptions().queries;

    expect(queries?.refetchOnWindowFocus).toBe(false);
    expect(queries?.retry).toBe(shouldRetryRequest);
  });

  it('leaves mutations un-retried', () => {
    expect(
      createQueryClient().getDefaultOptions().mutations?.retry,
    ).toBeUndefined();
  });

  it('replaces one default without dropping the others', () => {
    const queries = createQueryClient({
      defaultOptions: { queries: { retry: 5 } },
    }).getDefaultOptions().queries;

    expect(queries?.retry).toBe(5);
    expect(queries?.refetchOnWindowFocus).toBe(false);
  });

  it('does not read a present-but-undefined key as an override', () => {
    // How conditional config is ordinarily written. A raw spread would copy
    // `retry: undefined` over the predicate, and react-query resolves that as
    // `retry ?? 3` — the retry-everything default this module exists to
    // replace, reinstated by a branch that meant to change nothing.
    const alwaysFail = false as boolean;

    const queries = createQueryClient({
      defaultOptions: {
        queries: {
          retry: alwaysFail ? false : undefined,
          refetchOnWindowFocus: undefined,
        },
      },
    }).getDefaultOptions().queries;

    expect(queries?.retry).toBe(shouldRetryRequest);
    expect(queries?.refetchOnWindowFocus).toBe(false);
  });

  it('keeps the defined keys of a partly-undefined override', () => {
    const queries = createQueryClient({
      defaultOptions: { queries: { retry: undefined, staleTime: 30_000 } },
    }).getDefaultOptions().queries;

    expect(queries?.retry).toBe(shouldRetryRequest);
    expect(queries?.staleTime).toBe(30_000);
  });

  it('passes the rest of QueryClientConfig through untouched', () => {
    const queryCache = new QueryCache();

    const client = createQueryClient({
      queryCache,
      defaultOptions: { mutations: { retry: 1 }, dehydrate: {} },
    });

    expect(client.getQueryCache()).toBe(queryCache);
    expect(client.getDefaultOptions().mutations?.retry).toBe(1);
    expect(client.getDefaultOptions().dehydrate).toEqual({});
    expect(client.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(
      false,
    );
  });

  it('returns a distinct client per call', () => {
    expect(createQueryClient()).not.toBe(createQueryClient());
  });

  it('is a real QueryClient', () => {
    expect(createQueryClient()).toBeInstanceOf(QueryClient);
  });
});

describe('the retry policy a real client applies', () => {
  /**
   * How many times a query rejecting with `error` is attempted under the
   * package defaults. Only `retryDelay` is overridden — `retry` is the default
   * under test — so the exponential backoff does not make the spec wait out
   * the three seconds a real screen would.
   */
  async function countAttempts(error: unknown): Promise<number> {
    let attempts = 0;

    await createQueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })
      .fetchQuery({
        queryKey: ['attempts'],
        queryFn: () => {
          attempts += 1;
          return Promise.reject(error);
        },
      })
      .catch(() => undefined);

    return attempts;
  }

  it('asks once when the response body drifted', async () => {
    // Before the validation carve-out this was 3, and with the default
    // backoff the error reached the screen three seconds late.
    await expect(countAttempts(validationError())).resolves.toBe(1);
  });

  it('asks once on a client fault', async () => {
    await expect(countAttempts(httpError(422))).resolves.toBe(1);
  });

  // The rest of the statusless branch is unchanged: no status and no verdict
  // from the server means the only reading available is that the request did
  // not complete.
  it.for([
    ['a dropped connection', new TypeError('Failed to fetch')],
    ['an abort', new DOMException('The operation was aborted.', 'AbortError')],
    [
      'a middleware that threw',
      new Error('http-client-react: middleware called next() more than once'),
    ],
  ] as const)('still retries %s twice', async ([, error]) => {
    await expect(countAttempts(error)).resolves.toBe(3);
  });

  it('retries a server fault twice', async () => {
    await expect(countAttempts(httpError(503))).resolves.toBe(3);
  });
});

describe('the retry policy a mounted query applies', () => {
  // `fetchQuery` rewrites an `undefined` retry to `false`, so `countAttempts`
  // above reads 1 whether the predicate is installed or missing — it cannot
  // see a retry default that went away. A subscribed observer is the
  // `useQuery` path, where react-query falls back to `retry ?? 3` instead, and
  // the only place a lost predicate costs visible round trips.
  const serverByDefault = environmentManager.isServer();

  // That fallback is `?? 0` on the server, and these specs run under `node`.
  beforeAll(() => environmentManager.setIsServer(() => false));
  afterAll(() => environmentManager.setIsServer(() => serverByDefault));

  /** How many times a *mounted* query rejecting with `error` is attempted. */
  async function countMountedAttempts(
    config: QueryClientConfig,
    error: unknown,
  ): Promise<number> {
    let attempts = 0;

    const observer = new QueryObserver(createQueryClient(config), {
      queryKey: ['mounted-attempts'],
      queryFn: () => {
        attempts += 1;
        return Promise.reject(error);
      },
      retryDelay: 0,
    });

    await new Promise<void>((resolve) => {
      const unsubscribe = observer.subscribe((result) => {
        if (result.status === 'error') {
          unsubscribe();
          resolve();
        }
      });
    });

    return attempts;
  }

  it('asks once on a client fault', async () => {
    await expect(countMountedAttempts({}, httpError(422))).resolves.toBe(1);
  });

  it('asks once when an override names `retry` as undefined', async () => {
    // The shape a conditional override is ordinarily written in. Before the
    // merge dropped undefined-valued keys this was 4 — react-query's own
    // `retry ?? 3`, reinstated by a branch that meant to change nothing.
    const alwaysFail = false as boolean;

    await expect(
      countMountedAttempts(
        {
          defaultOptions: {
            queries: { retry: alwaysFail ? false : undefined },
          },
        },
        httpError(422),
      ),
    ).resolves.toBe(1);
  });

  it('retries a server fault twice', async () => {
    await expect(countMountedAttempts({}, httpError(503))).resolves.toBe(3);
  });
});
