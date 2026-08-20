import { describe, expect, it } from 'vitest';

import {
  createJsonSearchRouter,
  createNonConvergingRouter,
  createThrowingRouter,
  createToyRouter,
} from './test-fixtures.js';
import { resolveEntryUrl, settleEntryUrl } from './testing.js';

const toyRouter = createToyRouter();

describe('resolveEntryUrl', () => {
  it('reports the leaf a cold load would render', () => {
    const resolution = resolveEntryUrl(toyRouter.options, '/items/42');

    expect(resolution.redirectTo).toBeNull();
    expect(resolution.routeId).toBe('/items/$itemId');
    expect(resolution.params).toEqual({ itemId: '42' });
  });

  it('reports the leaf’s strict search, with the parent schema folded in', () => {
    const resolution = resolveEntryUrl(
      toyRouter.options,
      '/items/42?q=usd&tab=detail',
    );

    expect(resolution.search).toEqual({
      q: 'usd',
      tab: 'detail',
      item: undefined,
    });
  });

  it('skips routes that declare no beforeLoad', () => {
    expect(
      resolveEntryUrl(toyRouter.options, '/items/42').redirectTo,
    ).toBeNull();
  });

  it('reports the root for a path nothing matches, rather than failing', () => {
    // Useful signal rather than an edge case: a tree with no catch-all settles
    // unknown paths on the root, which is visible here instead of in production.
    expect(resolveEntryUrl(toyRouter.options, '/nope/deep').routeId).toBe(
      '__root__',
    );
  });

  it('surfaces a beforeLoad failure that is not a redirect', () => {
    const router = createThrowingRouter();

    expect(() => resolveEntryUrl(router.options, '/plain')).toThrow(
      'beforeLoad blew up',
    );
  });
});

describe('settleEntryUrl — the caller’s router config decides the answer', () => {
  it('honours the trailingSlash option the app ships', () => {
    expect(resolveEntryUrl(toyRouter.options, '/plain/').routeId).toBe(
      '/plain',
    );
  });

  it('settles one URL differently under two search grammars', () => {
    // Identity parse/stringify: a search term that happens to be valid JSON is
    // still the text the user typed, so it survives the cleanup.
    expect(settleEntryUrl(toyRouter.options, '/plain?q=null').url).toBe(
      '/plain?q=null',
    );

    // The router's default grammar JSON-decodes it first, so the same schema
    // sees the value `null`, drops it, and the cleanup strips the key. A harness
    // that rebuilt the config rather than taking the caller's would assert one
    // of these two answers against a route tree that produces the other.
    expect(
      settleEntryUrl(createJsonSearchRouter().options, '/plain?q=null').url,
    ).toBe('/plain');
  });
});

describe('settleEntryUrl — convergence', () => {
  it('returns the entry URL itself when nothing redirects', () => {
    const settled = settleEntryUrl(toyRouter.options, '/plain');

    expect(settled.url).toBe('/plain');
    expect(settled.hops).toEqual(['/plain']);
  });

  it('records every URL visited, entry first', () => {
    const settled = settleEntryUrl(
      toyRouter.options,
      '/items/42?item=7&tab=bogus',
    );

    expect(settled.hops).toEqual([
      '/items/42?item=7&tab=bogus',
      '/items/42?item=7',
      '/items/42',
    ]);
    expect(settled.url).toBe('/items/42');
  });

  it('returns the settled leaf alongside the URL', () => {
    const settled = settleEntryUrl(toyRouter.options, '/plain?tab=bogus&q=x');

    expect(settled.result.routeId).toBe('/plain');
    expect(settled.result.search).toEqual({
      q: 'x',
      tab: undefined,
      item: undefined,
    });
  });
});

describe('settleEntryUrl — non-convergence', () => {
  const nonConverging = createNonConvergingRouter();

  it('throws once the hop budget is spent', () => {
    expect(() =>
      settleEntryUrl(nonConverging.options, '/plain?grows=a'),
    ).toThrow(/never stopped redirecting within 4 hops/);
  });

  it('names the cycle it walked, so the offending param is visible', () => {
    expect(() =>
      settleEntryUrl(nonConverging.options, '/plain?grows=a'),
    ).toThrow(/\/plain\?grows=a -> \/plain\?grows=ax -> \/plain\?grows=axx/);
  });

  it('honours a caller-supplied hop budget', () => {
    expect(() =>
      settleEntryUrl(nonConverging.options, '/plain?grows=a', { maxHops: 1 }),
    ).toThrow(/within 1 hops/);
  });

  it('accepts a chain that fits the budget exactly', () => {
    const settled = settleEntryUrl(
      toyRouter.options,
      '/items/42?item=7&tab=bogus',
      { maxHops: 2 },
    );

    expect(settled.url).toBe('/items/42');
  });

  it('rejects the same chain one hop short', () => {
    expect(() =>
      settleEntryUrl(toyRouter.options, '/items/42?item=7&tab=bogus', {
        maxHops: 1,
      }),
    ).toThrow(/never stopped redirecting/);
  });
});
