import { hashKey } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import {
  buildQueryApiKey,
  canonicalizeQueryKeyValue,
  sanitizeQueryInit,
} from './query-key.js';

describe('sanitizeQueryInit', () => {
  it('is insensitive to param key order', () => {
    const a = sanitizeQueryInit({ params: { query: { limit: 10, q: 'ada' } } });
    const b = sanitizeQueryInit({ params: { query: { q: 'ada', limit: 10 } } });

    expect(a).toEqual(b);
    // Deep equality is not the point — the *serialized* form has to match, or
    // partial-match invalidation and devtools output diverge.
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('sorts nested object keys, at every depth', () => {
    const sanitized = sanitizeQueryInit({
      body: { z: 1, a: { d: 4, b: 2 } },
    });

    expect(JSON.stringify(sanitized)).toBe(
      '{"body":{"a":{"b":2,"d":4},"z":1}}',
    );
  });

  it('strips undefined-valued properties', () => {
    expect(
      sanitizeQueryInit({
        params: { query: { limit: 10, search: undefined } },
      }),
    ).toEqual({ query: { limit: 10 } });
  });

  it('collapses absent, empty, and all-undefined params to the same value', () => {
    const forms = [
      undefined,
      {},
      { params: {} },
      { params: { query: {} } },
      { params: { query: { limit: undefined } } },
    ];

    for (const form of forms) {
      expect(sanitizeQueryInit(form)).toEqual({});
    }
  });

  it('keeps array order and canonicalizes array members', () => {
    const sanitized = sanitizeQueryInit({
      params: { query: { ids: ['b', 'a'] } },
      body: [{ y: 2, x: 1 }],
    });

    expect(JSON.stringify(sanitized)).toBe(
      '{"query":{"ids":["b","a"]},"body":[{"x":1,"y":2}]}',
    );
  });

  it('keeps path params, query params, and the body — and nothing else', () => {
    const sanitized = sanitizeQueryInit({
      params: {
        path: { id: 'u1' },
        query: { expand: 'roles' },
        header: { authorization: 'Bearer secret' },
        cookie: { session: 'secret' },
      },
      body: { name: 'Ada' },
      signal: new AbortController().signal,
      headers: { authorization: 'Bearer secret' },
      baseUrl: 'https://other.test',
      parseAs: 'text',
      fetch: () => Promise.resolve(new Response()),
    });

    expect(sanitized).toEqual({
      path: { id: 'u1' },
      query: { expand: 'roles' },
      body: { name: 'Ada' },
    });
  });

  it('preserves a falsy body', () => {
    expect(sanitizeQueryInit({ body: 0 })).toEqual({ body: 0 });
    expect(sanitizeQueryInit({ body: null })).toEqual({ body: null });
  });

  it('leaves non-plain objects by reference', () => {
    const date = new Date(0);
    expect(canonicalizeQueryKeyValue(date)).toBe(date);
  });
});

describe('buildQueryApiKey', () => {
  it('derives [method, path, sanitized(init)]', () => {
    expect(
      buildQueryApiKey('get', '/users/{id}', {
        params: { path: { id: 'u1' } },
      }),
    ).toEqual(['get', '/users/{id}', { path: { id: 'u1' } }]);
  });

  it('always emits three elements, so [method, path] prefix-matches', () => {
    expect(buildQueryApiKey('get', '/users')).toEqual(['get', '/users', {}]);
  });

  it('hashes two orderings of the same request to one cache entry', () => {
    const a = buildQueryApiKey('get', '/users', {
      params: { query: { limit: 10, search: 'ada' } },
    });
    const b = buildQueryApiKey('get', '/users', {
      params: { query: { search: 'ada', limit: 10 } },
    });

    expect(hashKey(a)).toBe(hashKey(b));
  });
});
