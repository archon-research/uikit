import { setupWorker } from 'msw/browser';
import { setupServer } from 'msw/node';
import { describe, expectTypeOf, it } from 'vitest';

import {
  createRequestRecorder,
  type MockLifeCycleSource,
} from './request-recorder.js';

/**
 * `MockLifeCycleSource` is described structurally so the recorder can live in
 * the package root — naming msw's own emitter type would pull in `msw/browser`,
 * which does not resolve under a node-only condition set. The cost of that
 * choice is that nothing checks the structural type still fits msw's real one,
 * which is exactly the kind of drift a minor msw release causes quietly.
 *
 * So both setups are assigned to it here. `setupWorker` is the one worth
 * pinning: its `events` is typed over the HTTP *and* WebSocket event maps, a
 * wider map than the server's, and this is the only place that combination is
 * type-checked. The file imports `msw/browser` deliberately — a test is not
 * bundled, so it does not put that import on any consumer's path.
 *
 * Checked by `npm run type:check`; the `it` block only keeps vitest from
 * reporting an empty file.
 */

declare const worker: ReturnType<typeof setupWorker>;
declare const server: ReturnType<typeof setupServer>;

export function typeAssertions(): void {
  expectTypeOf(worker).toExtend<MockLifeCycleSource>();
  expectTypeOf(server).toExtend<MockLifeCycleSource>();

  const recorder = createRequestRecorder(worker);
  expectTypeOf(recorder.count('GET /things')).toBeNumber();
  expectTypeOf(recorder.count(/^GET/)).toBeNumber();
  expectTypeOf(recorder.counts()).toEqualTypeOf<Record<string, number>>();
  expectTypeOf(recorder.all()[0]!.url).toEqualTypeOf<URL>();

  // The selector is a key predicate, not a raw `Request` one.
  // @ts-expect-error `string` has no `pathname`.
  recorder.count((request) => request.key.pathname === '/things');
}

describe('createRequestRecorder — types', () => {
  it('is asserted by tsc, not at runtime', () => {
    expectTypeOf(createRequestRecorder).toBeFunction();
  });
});
