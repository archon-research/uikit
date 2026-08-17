/**
 * Two different base URLs live in this package and they normalize to opposite
 * shapes, so both live here rather than being inlined at their call sites:
 *
 * - the **API** base (`createMockApi({ baseUrl })`) is prepended to OpenAPI path
 *   templates, which already start with `/`, so it must not end in one;
 * - the **app** base (`setupMockWorker(mocks, { baseUrl })`) is the public base
 *   path a subpath deployment is served from, and the worker script filename is
 *   appended to it, so it must end in one.
 */

/** How an origin-relative API base is matched. See {@link resolveHandlerBase}. */
export type MockOriginMatching = 'any' | 'exact';

const ABSOLUTE_URL = /^[a-z][a-z\d+.-]*:\/\//i;

export function isAbsoluteUrl(url: string): boolean {
  return ABSOLUTE_URL.test(url);
}

/** Strips trailing slashes so `${base}${'/things'}` never doubles up. */
export function normalizeApiBaseUrl(baseUrl?: string): string {
  if (!baseUrl) return '';

  return baseUrl.replace(/\/+$/, '');
}

/**
 * The prefix every handler path is built on.
 *
 * msw resolves a relative handler path against `document.baseURI` in the browser
 * and leaves it relative in node, where request URLs are always absolute — so a
 * relative path silently matches nothing under `setupServer`. Prefixing an
 * origin-relative base with msw's `*` wildcard makes one handler array match in
 * both, which is what lets the same mocks serve dev, vitest, and Playwright.
 *
 * `'exact'` opts out and keeps the path relative — same-origin matching only,
 * and node tests then need an absolute `baseUrl`. An absolute base already pins
 * the origin, so the setting does not apply to one.
 */
export function resolveHandlerBase(
  baseUrl: string | undefined,
  origin: MockOriginMatching,
): string {
  const normalized = normalizeApiBaseUrl(baseUrl);

  if (isAbsoluteUrl(normalized) || origin === 'exact') return normalized;

  return `*${normalized}`;
}

/**
 * The URL msw's service worker script is served from. It follows the app's
 * public base path — `import.meta.env.BASE_URL` under Vite — because a bundler
 * copies `public/mockServiceWorker.js` to `${base}mockServiceWorker.js`, and the
 * worker's scope is limited to the directory it is served from.
 */
export function resolveWorkerScriptUrl(baseUrl?: string): string {
  const base = baseUrl && baseUrl.length > 0 ? baseUrl : '/';

  return `${base.endsWith('/') ? base : `${base}/`}mockServiceWorker.js`;
}
