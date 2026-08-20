import { describe, expectTypeOf, it } from 'vitest';

import { createToyRouter } from './test-fixtures.js';
import {
  type EntryUrlResolution,
  resolveEntryUrl,
  type SettledEntryUrl,
  settleEntryUrl,
} from './testing.js';

/**
 * Type-level coverage of the harness surface: `redirectTo` is a real
 * discriminant, and the router's own options are what the harness takes.
 * Checked by `npm run type:check`, so the assertions live in a function that is
 * never called.
 */

describe('settleEntryUrl — inference', () => {
  it('is asserted by tsc, not at runtime', () => {
    expectTypeOf(settleEntryUrl).toBeFunction();
  });
});

export async function typeAssertions(): Promise<void> {
  const { options } = createToyRouter();

  // Checking `redirectTo` narrows to the settled leaf, so the route identity is
  // no longer optional.
  const resolution: EntryUrlResolution = await resolveEntryUrl(
    options,
    '/plain',
  );
  if (resolution.redirectTo === null) {
    expectTypeOf(resolution.routeId).toEqualTypeOf<string>();
    expectTypeOf(resolution.params).toEqualTypeOf<Record<string, string>>();
  } else {
    expectTypeOf(resolution.redirectTo).toEqualTypeOf<string>();
  }

  // Un-narrowed reads still work, which is what an assertion usually wants.
  expectTypeOf(resolution.replace).toEqualTypeOf<boolean | undefined>();

  // Both entry points are async: a `beforeLoad` may be, and awaiting it is what
  // makes an async redirect reachable at all.
  expectTypeOf(settleEntryUrl(options, '/plain')).toEqualTypeOf<
    Promise<SettledEntryUrl>
  >();

  // A settled result is always the leaf arm, never a redirect.
  const settled = await settleEntryUrl(options, '/plain');
  expectTypeOf(settled.result.redirectTo).toEqualTypeOf<null>();
  expectTypeOf(settled.hops).toEqualTypeOf<readonly string[]>();

  // @ts-expect-error - a route tree is not a router options object; the parse
  // and stringify config is exactly what must not be rebuilt here
  settleEntryUrl(options.routeTree, '/plain');

  // @ts-expect-error - the hop budget is a count
  settleEntryUrl(options, '/plain', { maxHops: 'four' });

  // @ts-expect-error - unknown options are rejected rather than ignored
  settleEntryUrl(options, '/plain', { hopLimit: 4 });
}
