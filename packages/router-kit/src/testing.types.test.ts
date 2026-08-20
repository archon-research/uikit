import { describe, expectTypeOf, it } from 'vitest';

import { createToyRouter } from './test-fixtures.js';
import {
  type EntryUrlResolution,
  resolveEntryUrl,
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

export function typeAssertions(): void {
  const { options } = createToyRouter();

  // Checking `redirectTo` narrows to the settled leaf, so the route identity is
  // no longer optional.
  const resolution: EntryUrlResolution = resolveEntryUrl(options, '/plain');
  if (resolution.redirectTo === null) {
    expectTypeOf(resolution.routeId).toEqualTypeOf<string>();
    expectTypeOf(resolution.params).toEqualTypeOf<Record<string, string>>();
  } else {
    expectTypeOf(resolution.redirectTo).toEqualTypeOf<string>();
  }

  // Un-narrowed reads still work, which is what an assertion usually wants.
  expectTypeOf(resolution.replace).toEqualTypeOf<boolean | undefined>();

  // A settled result is always the leaf arm, never a redirect.
  expectTypeOf(
    settleEntryUrl(options, '/plain').result.redirectTo,
  ).toEqualTypeOf<null>();
  expectTypeOf(settleEntryUrl(options, '/plain').hops).toEqualTypeOf<
    readonly string[]
  >();

  // @ts-expect-error - a route tree is not a router options object; the parse
  // and stringify config is exactly what must not be rebuilt here
  settleEntryUrl(options.routeTree, '/plain');

  // @ts-expect-error - the hop budget is a count
  settleEntryUrl(options, '/plain', { maxHops: 'four' });

  // @ts-expect-error - unknown options are rejected rather than ignored
  settleEntryUrl(options, '/plain', { hopLimit: 4 });
}
