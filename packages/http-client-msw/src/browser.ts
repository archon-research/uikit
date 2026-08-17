/**
 * Browser entry: `@archon-research/http-client-msw/browser`.
 *
 * Kept behind its own subpath so `msw/browser` — and the service-worker
 * machinery it pulls in — never reaches a node test's module graph, and so an
 * app bundle that imports only this entry does not drag in `msw/node`.
 */

import { setupWorker, type SetupWorker } from 'msw/browser';

import type { MockSetup } from './setup.js';
import {
  buildWorkerStartOptions,
  createIdempotentStart,
  type MockWorkerOptions,
} from './worker-options.js';

/**
 * Re-exported here rather than from the package root: their types reference
 * `msw/browser`, which does not resolve under a node-only condition set.
 */
export {
  buildWorkerStartOptions,
  createIdempotentStart,
  type MockWorkerOptions,
} from './worker-options.js';

export type MockWorker = {
  /** The underlying msw worker, for `use()` and lifecycle events. */
  worker: SetupWorker;
  /** Registers and activates the worker. Idempotent; safe to await anywhere. */
  start: () => Promise<void>;
  stop: () => void;
  /** Runs the setup's state resets, then drops runtime handler overrides. */
  reset: () => void;
};

/**
 * Serves a {@link MockSetup} from a service worker.
 *
 * Call `start()` and await it **before** rendering, so no component can fire a
 * request the worker is not yet intercepting:
 *
 * ```ts
 * // src/main.tsx
 * if (import.meta.env.VITE_API_MOCKS === '1') {
 *   const { setupMockWorker } = await import(
 *     '@archon-research/http-client-msw/browser'
 *   );
 *   const { mocks } = await import('./mocks');
 *
 *   await setupMockWorker(mocks, { baseUrl: import.meta.env.BASE_URL }).start();
 * }
 *
 * createRoot(document.getElementById('root')!).render(<App />);
 * ```
 *
 * The dynamic imports are what keep msw and the fixtures out of a production
 * bundle: with a statically analysable `import.meta.env` flag, the whole branch
 * is dead code a bundler drops.
 */
export function setupMockWorker(
  mocks: MockSetup,
  options: MockWorkerOptions = {},
): MockWorker {
  const worker = setupWorker(...mocks.handlers);
  const startOptions = buildWorkerStartOptions(options);

  return {
    worker,
    start: createIdempotentStart(async () => {
      await worker.start(startOptions);
    }),
    stop: () => worker.stop(),
    reset: () => {
      mocks.resetState();
      worker.resetHandlers();
    },
  };
}
