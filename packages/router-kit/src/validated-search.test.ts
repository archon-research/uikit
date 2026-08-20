import { describe, expect, it } from 'vitest';

import {
  createNonConvergingRouter,
  createPushingRouter,
  createToyRouter,
  stringifySearch,
} from './test-fixtures.js';
import { resolveEntryUrl, settleEntryUrl } from './testing.js';
import {
  createSearchParamStripper,
  createValidatedSearchRedirect,
  rendersSameSearch,
} from './validated-search.js';

const toyRouter = createToyRouter();

async function settle(url: string): Promise<string> {
  return (await settleEntryUrl(toyRouter.options, url)).url;
}

function redirectOf(url: string) {
  return resolveEntryUrl(toyRouter.options, url);
}

describe('rendersSameSearch', () => {
  it('compares as URL text, so a coerced number matches its string', () => {
    expect(rendersSameSearch({ rows: 25 }, { rows: '25' })).toBe(true);
    expect(rendersSameSearch({ on: true }, { on: 'true' })).toBe(true);
  });

  it('ignores key order, because a reordering renders the same data', () => {
    expect(rendersSameSearch({ b: '2', a: '1' }, { a: '1', b: '2' })).toBe(
      true,
    );
  });

  it('ignores applied keys the schema dropped', () => {
    expect(rendersSameSearch({ a: '1' }, { a: '1', b: undefined })).toBe(true);
  });

  it('rejects a raw key the schema did not keep', () => {
    expect(rendersSameSearch({ a: '1', stale: 'x' }, { a: '1' })).toBe(false);
  });

  it('rejects a rewritten value', () => {
    expect(rendersSameSearch({ a: ' padded ' }, { a: 'padded' })).toBe(false);
  });

  it('rejects a repeated key, which decodes to an array', () => {
    expect(rendersSameSearch({ a: ['1', '2'] }, { a: '1' })).toBe(false);
  });
});

describe('createValidatedSearchRedirect', () => {
  it('leaves a URL that already renders what validation applied', async () => {
    expect((await redirectOf('/plain')).redirectTo).toBeNull();
    expect((await redirectOf('/plain?tab=overview&q=x')).redirectTo).toBeNull();
  });

  it('leaves a URL whose keys are merely out of the canonical order', async () => {
    expect((await redirectOf('/plain?q=x&tab=overview')).redirectTo).toBeNull();
  });

  it('rewrites the address bar to what validation kept', async () => {
    expect(await settle('/plain?tab=bogus')).toBe('/plain');
    expect(await settle('/plain?tab=bogus&q=x')).toBe('/plain?q=x');
    expect(await settle('/plain?q=%20padded%20')).toBe('/plain?q=padded');
  });

  it('drops a param no route on the branch validates', async () => {
    expect(await settle('/plain?unvalidated=1')).toBe('/plain');
  });

  it('drops a param that is present but empty', async () => {
    expect(await settle('/plain?q=')).toBe('/plain');
    expect(await settle('/plain?q')).toBe('/plain');
  });

  it('redirects to an explicit href rather than a relative target', async () => {
    const resolution = await redirectOf('/plain?tab=bogus');

    expect(resolution.redirectTo).toBe('/plain');
    expect(resolution.redirectTo).not.toBe('.');
  });

  it('replaces, so a rejected URL stays out of the back history', async () => {
    expect((await redirectOf('/plain?tab=bogus')).replace).toBe(true);
  });

  it('carries the hash across the rewrite', async () => {
    expect(await settle('/plain?tab=bogus#section')).toBe('/plain#section');
  });

  it('reaches a fixed point in one hop, then stops', async () => {
    const settled = await settleEntryUrl(
      toyRouter.options,
      '/plain?tab=bogus&q=x',
    );

    expect(settled.hops).toEqual(['/plain?tab=bogus&q=x', '/plain?q=x']);
    expect((await redirectOf(settled.url)).redirectTo).toBeNull();
  });

  it('is a no-op on a context whose matches carry no strict search', () => {
    const cleanup = createValidatedSearchRedirect({ stringifySearch });

    expect(() =>
      cleanup({
        location: { pathname: '/plain', hash: '', search: {} },
        matches: [],
      }),
    ).not.toThrow();
  });
});

describe('createSearchParamStripper', () => {
  it('drops the key on the branch that owns the value elsewhere', async () => {
    expect(await settle('/items/42?item=7')).toBe('/items/42');
  });

  it('carries every other param across untouched', async () => {
    expect(await settle('/items/42?item=7&q=x&tab=detail')).toBe(
      '/items/42?q=x&tab=detail',
    );
  });

  it('leaves the key alone on a branch that does not strip it', async () => {
    expect(await settle('/plain?item=7')).toBe('/plain?item=7');
  });

  it('does not redirect when the key is already absent', async () => {
    expect((await redirectOf('/items/42?q=x')).redirectTo).toBeNull();
  });

  it('replaces rather than pushes', async () => {
    expect((await redirectOf('/items/42?item=7')).replace).toBe(true);
  });

  it('composes with the root cleanup and settles once', async () => {
    const settled = await settleEntryUrl(
      toyRouter.options,
      '/items/42?item=7&tab=bogus',
    );

    expect(settled.url).toBe('/items/42');
    expect((await redirectOf(settled.url)).redirectTo).toBeNull();
  });

  it('is a no-op when the context search is not a record', () => {
    const strip = createSearchParamStripper('item', { stringifySearch });

    expect(() =>
      strip({ location: { pathname: '/items/42', hash: '' }, search: {} }),
    ).not.toThrow();
  });
});

describe('the loop-safety the cleanup depends on', () => {
  it('never settles when a schema is not idempotent', async () => {
    const router = createNonConvergingRouter();

    await expect(
      settleEntryUrl(router.options, '/plain?grows=a'),
    ).rejects.toThrow(/never stopped redirecting/);
  });

  it('settles for the same tree when the param is absent', async () => {
    const router = createNonConvergingRouter();

    expect((await settleEntryUrl(router.options, '/plain')).url).toBe('/plain');
  });

  it('rejects a redirect that pushes instead of replacing', async () => {
    const router = createPushingRouter();

    await expect(settleEntryUrl(router.options, '/plain')).rejects.toThrow(
      /without replace/,
    );
  });
});
