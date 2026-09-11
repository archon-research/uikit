/**
 * Counting the requests a scenario fires — "does opening the drawer twice fetch
 * twice?" — turns a refetch regression from something you notice into something
 * you assert. msw already knows every request it intercepts, so the count is
 * there for the taking; the difficulty is that the two obvious ways to get it
 * from outside msw both fail, and both fail *silently*, reporting zero rather
 * than erroring.
 *
 * ── Dead end 1: patching `globalThis.fetch` ──
 *
 * A spy installed over `window.fetch` after the API client was created sees
 * nothing. `openapi-fetch` resolves its fetch implementation once, in
 * `createClient`, as a default parameter:
 *
 *   fetch: baseFetch = globalThis.fetch,
 *
 * so the client closes over whatever `globalThis.fetch` was at construction
 * time. Reassigning the global afterwards leaves that reference untouched, and
 * the spy records zero calls while requests are plainly going out. Any client
 * that snapshots its transport at construction behaves the same way; this is not
 * specific to one library.
 *
 * ── Dead end 2: Resource Timing ──
 *
 * The intuition that a service-worker-fulfilled request leaves no
 * `PerformanceResourceTiming` entry is **wrong** — measured across Chromium,
 * Firefox and WebKit, an msw-mocked `fetch()` produces a resource entry in all
 * three. What makes Resource Timing the wrong instrument is what the entry
 * contains, not whether it exists:
 *
 * - There is no HTTP method on it, so `GET /things` and `POST /things` are
 *   indistinguishable — the thing a refetch assertion most needs to separate.
 * - `transferSize` is `0` and `nextHopProtocol` is `''` for a mocked response,
 *   which is also what a memory-cache hit looks like. "Was that a real refetch
 *   or a cache hit?" is not answerable from the entry.
 * - The fields that might disambiguate are engine-specific: `workerStart` is
 *   non-zero in Chromium and WebKit but `0` in Firefox even when the worker
 *   served the response; Chromium reports the mocked payload's real body size
 *   while Firefox and WebKit report `0`; `responseStatus` is absent in WebKit.
 * - The resource buffer is capped (250 entries by default), so a long scenario
 *   quietly drops its oldest entries.
 *
 * ── What works ──
 *
 * msw's own life-cycle events, which this package already owns. `request:start`
 * fires once per intercepted request with the `Request` itself, so the method,
 * URL, and headers are all there, and it works identically under the browser
 * worker and the node server.
 */

/**
 * The shape of a `request:start` / `request:unhandled` payload. msw hands
 * listeners a `RequestEvent` instance carrying these as own properties.
 */
type RequestLifeCycleEvent = {
  request: Request;
  requestId: string;
};

type RecordedEventType = 'request:start' | 'request:unhandled';

/**
 * The part of `worker.events` / `server.events` this needs, described
 * structurally rather than imported.
 *
 * Both `setupMockWorker().worker` and `setupMockServer().server` satisfy it, and
 * typing it this way keeps the recorder in the package root: naming msw's own
 * emitter type would drag in `msw/browser`, which does not resolve under a
 * node-only condition set.
 */
export type MockLifeCycleEmitter = {
  on(
    type: RecordedEventType,
    listener: (event: RequestLifeCycleEvent) => void,
  ): unknown;
  removeListener(
    type: RecordedEventType,
    listener: (event: RequestLifeCycleEvent) => void,
  ): unknown;
};

/** Anything with an msw life-cycle emitter on it. */
export type MockLifeCycleSource = { events: MockLifeCycleEmitter };

export type RecordedRequest = {
  /** Upper-case HTTP method, as msw reports it. */
  method: string;
  url: URL;
  /** msw's own id for the request, stable across its life-cycle events. */
  requestId: string;
  /** The grouping key — `GET /positions` unless `key` overrides it. */
  key: string;
  /**
   * True when no handler matched and msw let the request through. Worth
   * checking before trusting a count of zero: a request nothing mocked is a
   * hole in the fixtures, not evidence the app stayed quiet.
   */
  unhandled: boolean;
};

export type RequestRecorderOptions = {
  /**
   * Groups requests into counted buckets. Defaults to `` `${method} ${pathname}` ``
   * — method included because a refetch assertion has to tell a re-read from a
   * write, and the query string excluded because a second page of the same
   * endpoint is still a request to that endpoint.
   */
  key?: (request: Request) => string;
};

/** What `count` accepts: an exact key, a pattern over keys, or a predicate. */
export type RequestSelector =
  | string
  | RegExp
  | ((request: RecordedRequest) => boolean);

export type RequestRecorder = {
  /** Every request recorded so far, in the order msw saw them. */
  all: () => readonly RecordedRequest[];
  /** Requests per key, for asserting a whole scenario at once. */
  counts: () => Record<string, number>;
  /** How many recorded requests the selector matches. */
  count: (selector: RequestSelector) => number;
  /** Recorded requests no handler matched. */
  unhandled: () => readonly RecordedRequest[];
  /** Drops what has been recorded; keeps listening. */
  reset: () => void;
  /** Unsubscribes. A stopped recorder keeps whatever it already recorded. */
  stop: () => void;
};

function defaultKey(request: Request): string {
  return `${request.method} ${new URL(request.url).pathname}`;
}

/**
 * Records the requests msw intercepts, so a scenario can be asserted by count.
 *
 * ```ts
 * const requests = createRequestRecorder(mockServer.server);
 *
 * render(<Positions />);
 * await screen.findByText('Position 1');
 * requests.reset();
 *
 * await user.click(screen.getByRole('button', { name: 'Details' }));
 * await user.click(screen.getByRole('button', { name: 'Close' }));
 * await user.click(screen.getByRole('button', { name: 'Details' }));
 *
 * // The refetch assertion: reopening a drawer must not re-read the list.
 * expect(requests.count('GET /positions')).toBe(0);
 * expect(requests.counts()).toEqual({ 'GET /positions/p1': 1 });
 * ```
 *
 * The same call works against `setupMockWorker(...).worker` in a Playwright run
 * and `setupMockServer(...).server` in a unit test — it only needs `.events`.
 *
 * Subscribe **before** the scenario starts. The recorder can only count what it
 * was listening for, and a request fired during render is easy to miss by
 * constructing the recorder afterwards.
 */
export function createRequestRecorder(
  source: MockLifeCycleSource,
  options: RequestRecorderOptions = {},
): RequestRecorder {
  const key = options.key ?? defaultKey;
  let recorded: RecordedRequest[] = [];

  const onStart = (event: RequestLifeCycleEvent): void => {
    const request = event.request;
    recorded.push({
      method: request.method,
      url: new URL(request.url),
      requestId: event.requestId,
      key: key(request),
      unhandled: false,
    });
  };

  // `request:unhandled` fires after `request:start` for the same request, so the
  // entry is already recorded and is marked in place rather than added again.
  const onUnhandled = (event: RequestLifeCycleEvent): void => {
    const entry = recorded.find((item) => item.requestId === event.requestId);
    if (entry) entry.unhandled = true;
  };

  source.events.on('request:start', onStart);
  source.events.on('request:unhandled', onUnhandled);

  const matches = (
    selector: RequestSelector,
    request: RecordedRequest,
  ): boolean => {
    if (typeof selector === 'function') return selector(request);
    if (typeof selector === 'string') return request.key === selector;
    return selector.test(request.key);
  };

  return {
    all: () => recorded,
    counts: () => {
      const counts: Record<string, number> = {};
      for (const request of recorded) {
        counts[request.key] = (counts[request.key] ?? 0) + 1;
      }
      return counts;
    },
    count: (selector) =>
      recorded.filter((request) => matches(selector, request)).length,
    unhandled: () => recorded.filter((request) => request.unhandled),
    // A new array rather than `length = 0`: `all()` hands out the live one, and
    // truncating it would retroactively empty a list a caller is holding.
    reset: () => {
      recorded = [];
    },
    stop: () => {
      source.events.removeListener('request:start', onStart);
      source.events.removeListener('request:unhandled', onUnhandled);
    },
  };
}
