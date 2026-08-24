import { describe, expectTypeOf, it } from 'vitest';

// Imported from SOURCE, by relative path, on purpose. Two constraints rule out
// the package specifier `@archon-research/design-system`:
//
//  1. Its `exports` map resolves to `dist/`, so this test would only pass after
//     the design system had been built, coupling this package's test job to
//     another package's build step.
//  2. The design system is not a dependency of this package at all — see the
//     rationale on the local interface. A real import in `src/` would create
//     one; this file is excluded from `tsconfig.build.json`, so nothing reaches
//     the published output.
import type { UrlSyncedTableStateAdapter as UpstreamAdapter } from '../../design-system/src/components/data-table/types.ts';
import { createUrlSyncedTableAdapter } from './table-adapter.js';
import type { UrlSyncedTableStateAdapter } from './table-adapter.js';

/**
 * `UrlSyncedTableStateAdapter` restates the design system's seam because a
 * type-only import of a non-dependency would publish an unresolvable module
 * reference — which `skipLibCheck` silently widens to `any` rather than
 * failing. This test is what keeps the restatement honest: a property added,
 * removed, or retyped upstream fails here instead of leaving this package
 * producing an object that no longer fits the hook it exists to feed.
 *
 * Asserted by `tsc` (via `npm run type:check`) as much as by vitest, so the
 * assertions live in a function that is never called.
 */
describe('table adapter parity with the design system seam', () => {
  it('is asserted by tsc, not at runtime', () => {
    expectTypeOf(createUrlSyncedTableAdapter).toBeFunction();
  });
});

export function typeAssertions(): void {
  // Structural identity in both directions: neither type may gain, lose, or
  // retype a property without this failing.
  expectTypeOf<UrlSyncedTableStateAdapter>().toEqualTypeOf<UpstreamAdapter>();

  // The factory's product is directly usable as the upstream seam, which is the
  // only thing a consumer does with it.
  expectTypeOf(
    createUrlSyncedTableAdapter({
      search: {},
      sortKey: 'sort',
      searchKey: 'q',
      navigate: () => undefined,
    }),
  ).toExtend<UpstreamAdapter>();
}
