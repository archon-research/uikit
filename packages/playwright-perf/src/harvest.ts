import {
  COLLECTOR_SCRIPT,
  FLUSH_SCRIPT,
  type PerfSample,
  READ_SCRIPT,
} from './collector.js';
import type { PerfPage, PerfRequest, PerfResponse } from './page.js';

/**
 * One request the page issued, as the driving process saw it.
 *
 * This is the instrument `createRequestRecorder` documents Resource Timing as
 * failing to be. Playwright's `request` event carries the **method**, so
 * `GET /things` and `POST /things` are separate keys — and it fires for requests
 * a service worker goes on to fulfil, so an msw-mocked run is fully visible
 * from outside the page with no cooperation from the app. The response's
 * `fromServiceWorker()` then says which of the two answered.
 *
 * The in-page recorder is still the right tool inside a vitest run, where there
 * is no Playwright to ask; the key format here is deliberately identical
 * (`` `${method} ${pathname}` ``) so one assertion string reads the same in both.
 */
export type RecordedPageRequest = {
  /** `` `${method} ${pathname}` `` — query string excluded, method included. */
  key: string;
  method: string;
  url: string;
  /** Playwright's resource type: `fetch`, `xhr`, `script`, `document`, … */
  resourceType: string;
  /** Wall-clock milliseconds, for attributing the request to a phase. */
  at: number;
  /**
   * Whether a service worker answered. `null` when no response arrived at all —
   * an aborted or still-pending request, which is not the same as "went to the
   * network" and must not be counted as one.
   */
  fromServiceWorker: boolean | null;
  status: number | null;
};

/**
 * A phase edge, in epoch milliseconds on the driving process's clock.
 *
 * The driving process is the only clock the run has: the page's own restarts at
 * every navigation, so boundaries taken inside it cannot span one. In-page
 * entries are converted to this same absolute timeline with
 * `performance.timeOrigin` — see the collector.
 */
export type PhaseBoundary = {
  phase: string;
  edge: 'start' | 'end';
  at: number;
};

/** Everything one run collected, before it is summarised. */
export type PerfRunRaw = {
  sample: PerfSample;
  requests: readonly RecordedPageRequest[];
  boundaries: readonly PhaseBoundary[];
  /** Epoch ms at which the harvest attached, and at which it was read back. */
  startedAt: number;
  collectedAt: number;
};

export type PerfHarvest = {
  /**
   * Runs `body` as a named phase. Phases are the unit everything is reported
   * and budgeted against, and two phases in one run are the cheapest honest
   * comparison there is: same machine, same process, same minute.
   */
  phase: <T>(name: string, body: () => Promise<T>) => Promise<T>;
  /** Reads the page and the request log into one raw run. */
  collect: () => Promise<PerfRunRaw>;
  /** Detaches the request listeners. The collector stays in the page. */
  stop: () => void;
};

export type AttachOptions = {
  /**
   * Groups requests into counted buckets. Defaults to
   * `` `${method} ${pathname}` `` — the same default `createRequestRecorder`
   * uses, so a count assertion is portable between a Playwright run and a
   * vitest one.
   */
  key?: (request: PerfRequest) => string;
  /**
   * Which resource types to count. Defaults to the two an API call arrives as.
   * Widen it to include `script` when the question is what the page downloaded
   * rather than what it asked the API for.
   */
  resourceTypes?: readonly string[];
};

const DEFAULT_RESOURCE_TYPES = ['fetch', 'xhr'] as const;

function defaultKey(request: PerfRequest): string {
  let pathname: string;
  try {
    pathname = new URL(request.url()).pathname;
  } catch {
    pathname = request.url();
  }
  return `${request.method()} ${pathname}`;
}

/**
 * Installs the collector and starts recording requests.
 *
 * Call it **before** the first navigation: the collector has to be in place
 * before application code runs, or the boot long task — usually the largest one
 * in the run — is never observed, and the report is quietly missing the number
 * it exists to show.
 *
 * ```ts
 * const perf = await attachPerfHarvest(page);
 *
 * await perf.phase('cold load', async () => {
 *   await page.goto('/positions');
 *   await page.getByRole('row').first().waitFor();
 * });
 *
 * await perf.phase('open drawer', async () => {
 *   await page.getByRole('button', { name: 'Details' }).click();
 *   await page.getByRole('dialog').waitFor();
 * });
 *
 * await writePerfReport(summarizeRun(await perf.collect()), {
 *   outDir: 'perf',
 *   budgets: { 'open drawer': { blockingMs: 150, requests: { 'GET /positions': 0 } } },
 * });
 * ```
 */
export async function attachPerfHarvest(
  page: PerfPage,
  options: AttachOptions = {},
): Promise<PerfHarvest> {
  const key = options.key ?? defaultKey;
  const resourceTypes = new Set(
    options.resourceTypes ?? DEFAULT_RESOURCE_TYPES,
  );

  const startedAt = Date.now();
  const requests: RecordedPageRequest[] = [];
  const boundaries: PhaseBoundary[] = [];
  // Identity, not URL: two requests to the same URL in one phase are exactly
  // the case a refetch assertion is about, so they must not collapse into one.
  const byRequest = new Map<PerfRequest, RecordedPageRequest>();
  let openPhase: string | null = null;

  const onRequest = (request: PerfRequest): void => {
    if (!resourceTypes.has(request.resourceType())) return;
    const record: RecordedPageRequest = {
      key: key(request),
      method: request.method(),
      url: request.url(),
      resourceType: request.resourceType(),
      at: Date.now(),
      fromServiceWorker: null,
      status: null,
    };
    requests.push(record);
    byRequest.set(request, record);
  };

  const onResponse = (response: PerfResponse): void => {
    const record = byRequest.get(response.request());
    if (!record) return;
    record.fromServiceWorker = response.fromServiceWorker();
    record.status = response.status();
  };

  page.on('request', onRequest);
  page.on('response', onResponse);

  await page.addInitScript(COLLECTOR_SCRIPT);

  return {
    phase: async <T>(name: string, body: () => Promise<T>): Promise<T> => {
      if (openPhase !== null) {
        throw new Error(
          `playwright-perf: phase "${name}" was opened inside phase "${openPhase}". ` +
            'Phases partition a run and cannot nest — an entry would have to belong ' +
            'to two of them.',
        );
      }
      openPhase = name;
      boundaries.push({ phase: name, edge: 'start', at: Date.now() });
      try {
        return await body();
      } finally {
        boundaries.push({ phase: name, edge: 'end', at: Date.now() });
        openPhase = null;
      }
    },
    collect: async (): Promise<PerfRunRaw> => {
      await page.evaluate<boolean>(FLUSH_SCRIPT);
      const sample = await page.evaluate<PerfSample | null>(READ_SCRIPT);
      if (sample === null) {
        throw new Error(
          'playwright-perf: the in-page collector is not present, so there is nothing ' +
            'to read. attachPerfHarvest() installs it via addInitScript, which only ' +
            'applies to documents created after the call — navigate before collecting.',
        );
      }
      return {
        sample,
        requests: [...requests],
        boundaries,
        startedAt,
        collectedAt: Date.now(),
      };
    },
    stop: () => {
      page.removeListener('request', onRequest);
      page.removeListener('response', onResponse);
    },
  };
}
