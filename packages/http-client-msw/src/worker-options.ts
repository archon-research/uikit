import type { StartOptions } from 'msw/browser';

import { resolveWorkerScriptUrl } from './base-url.js';

/**
 * The browser entry's decisions, factored out of `browser.ts` so they are
 * testable without a service worker: a vitest run cannot register one, but it
 * can assert the options that would be passed and the start-once behaviour.
 */

export type MockWorkerOptions = {
  /**
   * The app's **public base path** — `import.meta.env.BASE_URL` under Vite — used
   * to locate the worker script for a subpath deployment. This is not the API
   * base from `createMockApi`: the script is served by the app, the API is
   * whatever the app talks to.
   *
   * @default '/'
   */
  baseUrl?: string;
  /**
   * What msw does with a request no handler matched.
   *
   * Defaults to `'bypass'`, unlike msw's own `'warn'`: an app running against
   * mocks still loads its own documents, modules, images, and fonts, and warning
   * on every one of them buries the requests a developer is actually looking at.
   * Use `'warn'` while filling gaps in a mock set.
   */
  onUnhandledRequest?: StartOptions['onUnhandledRequest'];
  /**
   * Suppress msw's per-request console logging. Defaults to `true` — the request
   * log is long enough to hide application logs, and the network panel already
   * shows the same traffic.
   */
  quiet?: boolean;
  /** Escape hatch merged last into msw's own `worker.start()` options. */
  start?: StartOptions;
};

export function buildWorkerStartOptions(
  options: MockWorkerOptions = {},
): StartOptions {
  const {
    baseUrl,
    onUnhandledRequest = 'bypass',
    quiet = true,
    start,
  } = options;

  return {
    onUnhandledRequest,
    quiet,
    ...start,
    serviceWorker: {
      url: resolveWorkerScriptUrl(baseUrl),
      ...start?.serviceWorker,
    },
  };
}

/**
 * Wraps a start function so concurrent and repeated calls share one
 * registration. An app entry, a hot reload, and a Playwright fixture can all
 * call `start()`; registering the worker again mid-session would reset its
 * handler list and drop any runtime overrides a test had installed.
 *
 * A rejected start clears the memo, so a caller can retry after fixing whatever
 * failed (a missing `mockServiceWorker.js`, most often).
 */
export function createIdempotentStart(
  start: () => Promise<void>,
): () => Promise<void> {
  let pending: Promise<void> | undefined;

  return () => {
    pending ??= start().catch((error: unknown) => {
      pending = undefined;
      throw error;
    });

    return pending;
  };
}
