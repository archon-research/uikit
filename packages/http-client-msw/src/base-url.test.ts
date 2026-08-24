import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { describe, expect, it } from 'vitest';

import {
  isAbsoluteUrl,
  type MockOriginMatching,
  normalizeApiBaseUrl,
  resolveHandlerBase,
  resolveWorkerScriptUrl,
} from './base-url.js';

describe('normalizeApiBaseUrl', () => {
  it('is empty when no base is given', () => {
    expect(normalizeApiBaseUrl()).toBe('');
    expect(normalizeApiBaseUrl('')).toBe('');
  });

  it('strips trailing slashes so a prefixed path never doubles up', () => {
    expect(normalizeApiBaseUrl('/api')).toBe('/api');
    expect(normalizeApiBaseUrl('/api/')).toBe('/api');
    expect(normalizeApiBaseUrl('/api//')).toBe('/api');
    expect(normalizeApiBaseUrl('/')).toBe('');
  });

  it('keeps an absolute base intact', () => {
    expect(normalizeApiBaseUrl('https://api.test/v1/')).toBe(
      'https://api.test/v1',
    );
  });
});

describe('isAbsoluteUrl', () => {
  it('distinguishes an origin-relative base from an absolute one', () => {
    expect(isAbsoluteUrl('http://localhost:3000/api')).toBe(true);
    expect(isAbsoluteUrl('https://api.test')).toBe(true);
    expect(isAbsoluteUrl('/api')).toBe(false);
    expect(isAbsoluteUrl('')).toBe(false);
  });

  it('does not count a protocol-relative base, which carries no scheme', () => {
    expect(isAbsoluteUrl('//api.test/v1')).toBe(false);
  });
});

describe('resolveHandlerBase', () => {
  it('wildcards the origin of a relative base by default', () => {
    expect(resolveHandlerBase('/api', 'any')).toBe('*/api');
    expect(resolveHandlerBase('/api/', 'any')).toBe('*/api');
    expect(resolveHandlerBase(undefined, 'any')).toBe('*');
  });

  it('keeps a relative base relative when matching exactly', () => {
    expect(resolveHandlerBase('/api', 'exact')).toBe('/api');
    expect(resolveHandlerBase(undefined, 'exact')).toBe('');
  });

  it('leaves an absolute base alone, since it already pins the origin', () => {
    expect(resolveHandlerBase('https://api.test/v1/', 'any')).toBe(
      'https://api.test/v1',
    );
    expect(resolveHandlerBase('https://api.test/v1', 'exact')).toBe(
      'https://api.test/v1',
    );
  });

  it('wildcards a protocol-relative base under either setting', () => {
    expect(resolveHandlerBase('//api.test/v1/', 'any')).toBe('*//api.test/v1');
    expect(resolveHandlerBase('//api.test/v1', 'exact')).toBe('*//api.test/v1');
  });
});

/**
 * The contract that actually matters is whether msw matches, not what string
 * comes back — a resolved base can read perfectly and still match nothing, at
 * which point the request escapes to the real network instead of failing.
 *
 * So these drive the resolved base through `setupServer`. The trailing
 * catch-all is what makes them match tests: msw resolves handlers in
 * declaration order, so a request the resolved base does not match falls
 * through to the sentinel rather than reaching the network, and the assertion
 * is which of the two answered.
 */
const answeredBy = async (
  baseUrl: string | undefined,
  origin: MockOriginMatching,
  url: string,
): Promise<'base' | 'sentinel'> => {
  const server = setupServer(
    http.get(`${resolveHandlerBase(baseUrl, origin)}/things`, () =>
      HttpResponse.json('base'),
    ),
    http.all(/.*/, () => HttpResponse.json('sentinel')),
  );

  server.listen({ onUnhandledRequest: 'error' });
  try {
    return (await (await fetch(url)).json()) as 'base' | 'sentinel';
  } finally {
    server.close();
  }
};

describe('resolveHandlerBase — matching under msw', () => {
  it('matches a protocol-relative base on either scheme', async () => {
    await expect(
      answeredBy('//api.test/v1', 'any', 'http://api.test/v1/things'),
    ).resolves.toBe('base');
    await expect(
      answeredBy('//api.test/v1', 'any', 'https://api.test/v1/things'),
    ).resolves.toBe('base');
    await expect(
      answeredBy('//api.test/v1', 'exact', 'https://api.test/v1/things'),
    ).resolves.toBe('base');
  });

  it('still pins the host of a protocol-relative base', async () => {
    await expect(
      answeredBy('//api.test/v1', 'any', 'https://elsewhere.test/v1/things'),
    ).resolves.toBe('sentinel');
  });

  it('matches an absolute base on its own scheme and host only', async () => {
    await expect(
      answeredBy('https://api.test/v1/', 'any', 'https://api.test/v1/things'),
    ).resolves.toBe('base');
    await expect(
      answeredBy('https://api.test/v1', 'any', 'http://api.test/v1/things'),
    ).resolves.toBe('sentinel');
    await expect(
      answeredBy('https://api.test/v1', 'any', 'https://other.test/v1/things'),
    ).resolves.toBe('sentinel');
  });

  it('matches any origin when no base is given', async () => {
    await expect(
      answeredBy(undefined, 'any', 'http://localhost/things'),
    ).resolves.toBe('base');
    await expect(
      answeredBy(undefined, 'any', 'https://api.test/things'),
    ).resolves.toBe('base');
  });

  it('matches any origin for a relative base by default', async () => {
    await expect(
      answeredBy('/api', 'any', 'http://localhost/api/things'),
    ).resolves.toBe('base');
    await expect(
      answeredBy('/api', 'any', 'https://api.test/api/things'),
    ).resolves.toBe('base');
  });

  it('matches nothing in node for a relative base under `exact`', async () => {
    // The documented cost of opting out: node request URLs are always
    // absolute, so the relative pattern never matches and a node test needs an
    // absolute `baseUrl` of its own.
    await expect(
      answeredBy('/api', 'exact', 'http://localhost/api/things'),
    ).resolves.toBe('sentinel');
  });
});

describe('resolveWorkerScriptUrl', () => {
  it('serves from the root by default', () => {
    expect(resolveWorkerScriptUrl()).toBe('/mockServiceWorker.js');
    expect(resolveWorkerScriptUrl('')).toBe('/mockServiceWorker.js');
    expect(resolveWorkerScriptUrl('/')).toBe('/mockServiceWorker.js');
  });

  it('follows the app base path for a subpath deployment', () => {
    expect(resolveWorkerScriptUrl('/app')).toBe('/app/mockServiceWorker.js');
    expect(resolveWorkerScriptUrl('/app/')).toBe('/app/mockServiceWorker.js');
    expect(resolveWorkerScriptUrl('/nested/app/')).toBe(
      '/nested/app/mockServiceWorker.js',
    );
  });
});
