import type { Page } from 'playwright';
import { describe, expectTypeOf, it } from 'vitest';

import { attachPerfHarvest } from './harvest.js';
import type { PerfPage } from './page.js';

/**
 * `PerfPage` is described structurally so the published package depends on no
 * Playwright at all — a consumer already pins its own, and a peer range here
 * could only disagree with it. The cost is that nothing would notice the
 * structural type drifting away from Playwright's real `Page`, which is exactly
 * what a minor Playwright release does quietly.
 *
 * So the real thing is assigned to it here. `on`/`removeListener` are the pair
 * worth pinning: Playwright types them as a large overload set, and this is the
 * only place the two signatures this package uses are checked against it.
 *
 * The import is type-only and a test is not bundled, so it puts nothing on a
 * consumer's path. Checked by `npm run type:check`; the `it` block only keeps
 * vitest from reporting an empty file.
 */

declare const page: Page;

export function typeAssertions(): void {
  expectTypeOf(page).toExtend<PerfPage>();

  // `attachPerfHarvest` therefore takes a real Page without a cast.
  expectTypeOf(attachPerfHarvest).toBeCallableWith(page);
}

describe('PerfPage — types', () => {
  it('is asserted by tsc, not at runtime', () => {
    expectTypeOf(attachPerfHarvest).toBeFunction();
  });
});
