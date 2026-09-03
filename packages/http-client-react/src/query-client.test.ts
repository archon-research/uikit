import { QueryCache, QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { HttpRequestError } from './errors.js';
import {
  createQueryClient,
  isRetryableError,
  isRetryableHttpStatus,
  shouldRetryRequest,
} from './query-client.js';

/** An `HttpRequestError` as `createQueryApi` would build it for `status`. */
function httpError(status: number): HttpRequestError {
  return new HttpRequestError({
    method: 'get',
    path: '/users',
    body: undefined,
    response: new Response(null, { status }),
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
