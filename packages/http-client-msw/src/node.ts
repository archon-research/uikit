/**
 * Node entry: `@archon-research/http-client-msw/node`.
 *
 * Kept behind its own subpath so an app bundle never resolves `msw/node`, whose
 * interceptors patch node's http modules.
 */

import { setupServer, type SetupServer } from 'msw/node';

import type { MockSetup } from './setup.js';

export type MockServerOptions = NonNullable<
  Parameters<SetupServer['listen']>[0]
>;

export type MockServer = {
  /** The underlying msw server, for `use()` and lifecycle events. */
  server: SetupServer;
  /** Starts interception. `onUnhandledRequest` defaults to `'error'`. */
  listen: (overrides?: MockServerOptions) => void;
  close: () => void;
  /** Runs the setup's state resets, then drops runtime handler overrides. */
  reset: () => void;
};

/**
 * Serves a {@link MockSetup} from msw's node interceptors — the same handler
 * array a browser worker serves.
 *
 * ```ts
 * // src/test-setup.ts
 * import { setupMockServer } from '@archon-research/http-client-msw/node';
 * import { afterAll, afterEach, beforeAll } from 'vitest';
 *
 * import { mocks } from './mocks';
 *
 * const mockServer = setupMockServer(mocks);
 *
 * beforeAll(() => mockServer.listen());
 * afterEach(() => mockServer.reset());
 * afterAll(() => mockServer.close());
 * ```
 *
 * `onUnhandledRequest` defaults to `'error'` rather than msw's `'warn'`: in a
 * test suite an unmocked request is a hole in the fixtures, and a warning that
 * scrolls past is how a test ends up asserting against real network output.
 */
export function setupMockServer(mocks: MockSetup): MockServer {
  const server = setupServer(...mocks.handlers);

  return {
    server,
    listen: (overrides) =>
      server.listen({ onUnhandledRequest: 'error', ...overrides }),
    close: () => server.close(),
    reset: () => {
      mocks.resetState();
      server.resetHandlers();
    },
  };
}
