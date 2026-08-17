import { describe, expect, it } from 'vitest';

import {
  isAbsoluteUrl,
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

  it('counts a protocol-relative base as absolute, since it pins the host', () => {
    expect(isAbsoluteUrl('//api.test/v1')).toBe(true);
    expect(resolveHandlerBase('//api.test/v1', 'any')).toBe('//api.test/v1');
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
