import { describe, expect, it } from 'vitest';

import {
  createAsyncRedirectRouter,
  createJsonSearchRouter,
  createNonConvergingRouter,
  createRedirectedPastRejectionRouter,
  createRejectingSchemaRouter,
  createThrowingRouter,
  createToyRouter,
} from './test-fixtures.js';
import { resolveEntryUrl, settleEntryUrl } from './testing.js';

const toyRouter = createToyRouter();

describe('resolveEntryUrl', () => {
  it('reports the leaf a cold load would render', async () => {
    const resolution = await resolveEntryUrl(toyRouter.options, '/items/42');

    expect(resolution.redirectTo).toBeNull();
    expect(resolution.routeId).toBe('/items/$itemId');
    expect(resolution.params).toEqual({ itemId: '42' });
  });

  it('reports the leaf’s strict search, with the parent schema folded in', async () => {
    const resolution = await resolveEntryUrl(
      toyRouter.options,
      '/items/42?q=usd&tab=detail',
    );

    expect(resolution.search).toEqual({
      q: 'usd',
      tab: 'detail',
      item: undefined,
    });
  });

  it('skips routes that declare no beforeLoad', async () => {
    const resolution = await resolveEntryUrl(toyRouter.options, '/items/42');

    expect(resolution.redirectTo).toBeNull();
  });

  it('reports the root for a path nothing matches, rather than failing', async () => {
    // Useful signal rather than an edge case: a tree with no catch-all settles
    // unknown paths on the root, which is visible here instead of in production.
    const resolution = await resolveEntryUrl(toyRouter.options, '/nope/deep');

    expect(resolution.routeId).toBe('__root__');
  });

  it('surfaces a beforeLoad failure that is not a redirect', async () => {
    const router = createThrowingRouter();

    await expect(resolveEntryUrl(router.options, '/plain')).rejects.toThrow(
      'beforeLoad blew up',
    );
  });
});

describe('resolveEntryUrl — a schema that rejects', () => {
  const rejecting = createRejectingSchemaRouter();

  // `matchRoutes` records a `validateSearch` rejection on the match instead of
  // throwing it, and carries on with a strict search of `{}`. Reporting that as
  // settled would be the harness at its least useful: the one URL the schemas
  // could not validate would come back looking clean, carrying a search no
  // schema produced.
  it('fails rather than reporting the unvalidatable URL as settled', async () => {
    await expect(resolveEntryUrl(rejecting.options, '/plain')).rejects.toThrow(
      /rejected the search in "\/plain"/,
    );
  });

  it('names the route whose schema rejected', async () => {
    await expect(resolveEntryUrl(rejecting.options, '/plain')).rejects.toThrow(
      /route "__root__"/,
    );
  });

  it('carries the validation message through, so the key is visible', async () => {
    await expect(resolveEntryUrl(rejecting.options, '/plain')).rejects.toThrow(
      /required/,
    );
  });

  it('keeps the rejection as the cause, not just as text', async () => {
    const thrown = await resolveEntryUrl(rejecting.options, '/plain').catch(
      (error: unknown) => error,
    );

    expect((thrown as Error).cause).toBeInstanceOf(Error);
  });

  it('settles a URL the same schema accepts', async () => {
    const settled = await settleEntryUrl(
      rejecting.options,
      '/plain?required=x',
    );

    expect(settled.url).toBe('/plain?required=x');
  });

  it('fails the whole settle, rather than stopping at a bad hop', async () => {
    await expect(settleEntryUrl(rejecting.options, '/plain')).rejects.toThrow(
      /rejected the search/,
    );
  });

  // The check runs in match order, where the router runs it. An ancestor's
  // `beforeLoad` has already redirected by the time a rejecting child would be
  // reached, so the URL production never validates is one this must not fail
  // on either — which rules out sweeping the matches for rejections up front,
  // and rules out `matchRoutes(..., { throwOnError: true })`.
  it('ignores a rejection on a branch an ancestor redirects away from', async () => {
    const router = createRedirectedPastRejectionRouter();

    const settled = await settleEntryUrl(router.options, '/legacy');

    expect(settled.url).toBe('/plain');
    expect(settled.result.routeId).toBe('/plain');
  });
});

describe('resolveEntryUrl — an async beforeLoad', () => {
  const asyncRouter = createAsyncRedirectRouter();

  // An auth guard or a context fetch is normally async, so its redirect arrives
  // as a rejected promise rather than a synchronous throw. Reporting the leaf
  // here would invert this harness's whole guarantee: the spec would pass while
  // production redirected elsewhere.
  it('catches a redirect thrown from an async beforeLoad', async () => {
    const resolution = await resolveEntryUrl(asyncRouter.options, '/plain');

    expect(resolution.redirectTo).toBe('/items');
    expect(resolution.replace).toBe(true);
  });

  it('settles that redirect instead of reporting the rejected route', async () => {
    const settled = await settleEntryUrl(asyncRouter.options, '/plain');

    expect(settled.url).toBe('/items');
    expect(settled.result.routeId).toBe('/items');
  });

  it('surfaces an async beforeLoad failure that is not a redirect', async () => {
    await expect(
      resolveEntryUrl(asyncRouter.options, '/broken'),
    ).rejects.toThrow('async beforeLoad blew up');
  });
});

describe('settleEntryUrl — the caller’s router config decides the answer', () => {
  it('honours the trailingSlash option the app ships', async () => {
    const resolution = await resolveEntryUrl(toyRouter.options, '/plain/');

    expect(resolution.routeId).toBe('/plain');
  });

  it('settles one URL differently under two search grammars', async () => {
    // Identity parse/stringify: a search term that happens to be valid JSON is
    // still the text the user typed, so it survives the cleanup.
    const identity = await settleEntryUrl(toyRouter.options, '/plain?q=null');

    expect(identity.url).toBe('/plain?q=null');

    // The router's default grammar JSON-decodes it first, so the same schema
    // sees the value `null`, drops it, and the cleanup strips the key. A harness
    // that rebuilt the config rather than taking the caller's would assert one
    // of these two answers against a route tree that produces the other.
    const json = await settleEntryUrl(
      createJsonSearchRouter().options,
      '/plain?q=null',
    );

    expect(json.url).toBe('/plain');
  });
});

describe('settleEntryUrl — convergence', () => {
  it('returns the entry URL itself when nothing redirects', async () => {
    const settled = await settleEntryUrl(toyRouter.options, '/plain');

    expect(settled.url).toBe('/plain');
    expect(settled.hops).toEqual(['/plain']);
  });

  it('records every URL visited, entry first', async () => {
    const settled = await settleEntryUrl(
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

  it('returns the settled leaf alongside the URL', async () => {
    const settled = await settleEntryUrl(
      toyRouter.options,
      '/plain?tab=bogus&q=x',
    );

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

  it('throws once the hop budget is spent', async () => {
    await expect(
      settleEntryUrl(nonConverging.options, '/plain?grows=a'),
    ).rejects.toThrow(/never stopped redirecting within 4 hops/);
  });

  it('names the cycle it walked, so the offending param is visible', async () => {
    await expect(
      settleEntryUrl(nonConverging.options, '/plain?grows=a'),
    ).rejects.toThrow(
      /\/plain\?grows=a -> \/plain\?grows=ax -> \/plain\?grows=axx/,
    );
  });

  it('honours a caller-supplied hop budget', async () => {
    await expect(
      settleEntryUrl(nonConverging.options, '/plain?grows=a', { maxHops: 1 }),
    ).rejects.toThrow(/within 1 hop:/);
  });

  it('accepts a chain that fits the budget exactly', async () => {
    const settled = await settleEntryUrl(
      toyRouter.options,
      '/items/42?item=7&tab=bogus',
      { maxHops: 2 },
    );

    expect(settled.url).toBe('/items/42');
  });

  it('rejects the same chain one hop short', async () => {
    await expect(
      settleEntryUrl(toyRouter.options, '/items/42?item=7&tab=bogus', {
        maxHops: 1,
      }),
    ).rejects.toThrow(/never stopped redirecting/);
  });
});
