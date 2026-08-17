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
  const { baseUrl, onUnhandledRequest, quiet, start } = options;

  return {
    ...start,
    // Resolved after the spread rather than defaulted before it: an options
    // object forwarded with explicit `undefined` values would otherwise put
    // those keys back and hand msw its own defaults instead of ours. `start`
    // still wins over the named options where it sets a value.
    onUnhandledRequest:
      start?.onUnhandledRequest ?? onUnhandledRequest ?? 'bypass',
    quiet: start?.quiet ?? quiet ?? true,
    serviceWorker: {
      url: resolveWorkerScriptUrl(baseUrl),
      ...start?.serviceWorker,
    },
  };
}

export type IdempotentStart = {
  /** Runs the wrapped function at most once, until `invalidate()`. */
  start: () => Promise<void>;
  /**
   * Forgets a completed start so the next `start()` runs again. Whatever the
   * start registered has to be torn down first — a memo pointing at a stopped
   * worker resolves immediately and intercepts nothing.
   */
  invalidate: () => void;
};

/**
 * Wraps a start function so concurrent and repeated calls share one
 * registration. An app entry, a hot reload, and a Playwright fixture can all
 * call `start()`; registering the worker again mid-session would reset its
 * handler list and drop any runtime overrides a test had installed.
 *
 * A rejected start invalidates itself, so a caller can retry after fixing
 * whatever failed (a missing `mockServiceWorker.js`, most often).
 */
export function createIdempotentStart(
  start: () => Promise<void>,
): IdempotentStart {
  let pending: Promise<void> | undefined;

  const invalidate = (): void => {
    pending = undefined;
  };

  return {
    start: () => {
      // Called through an async wrapper so a synchronous throw from `start`
      // rejects the returned promise instead of escaping as an exception the
      // caller has no way to `.catch`.
      pending ??= (async () => await start())().catch((error: unknown) => {
        invalidate();
        throw error;
      });

      return pending;
    },
    invalidate,
  };
}
