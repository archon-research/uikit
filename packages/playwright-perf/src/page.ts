/**
 * The slice of Playwright's `Page` this package drives, described structurally
 * rather than imported.
 *
 * Typing it this way means the published package has no dependency on
 * Playwright at all: it works against `@playwright/test`'s `Page`, plain
 * `playwright`'s `Page`, and anything else that offers the same four calls. A
 * consumer already pins its own Playwright; a peer dependency here would only
 * add a version range to disagree with.
 *
 * `on` is written as a method (not a function-typed property) so parameter types
 * stay bivariant — Playwright's `Request` has far more on it than
 * {@link PerfRequest} needs, and a stricter variance would reject the real
 * object for being too capable.
 */

/** What the harvest reads off an outgoing request. */
export type PerfRequest = {
  method(): string;
  url(): string;
  /** Playwright's classification: `document`, `script`, `fetch`, `xhr`, … */
  resourceType(): string;
};

/** What the harvest reads off a response, to pair it with its request. */
export type PerfResponse = {
  request(): PerfRequest;
  status(): number;
  /**
   * True when a service worker produced the response — which is what an
   * msw-mocked request looks like from the driving process, and the one field
   * that separates "the fixture answered" from "this went to the real network".
   */
  fromServiceWorker(): boolean;
};

export type PerfPage = {
  /**
   * Returns `Promise<unknown>` rather than `Promise<void>`: Playwright resolves
   * it with a `Disposable` that removes the script again, and pinning `void`
   * here made a real `Page` unassignable. The types test caught that, which is
   * the whole reason it exists.
   */
  addInitScript(script: string): Promise<unknown>;
  evaluate<R>(expression: string): Promise<R>;
  on(event: 'request', listener: (request: PerfRequest) => void): unknown;
  on(event: 'response', listener: (response: PerfResponse) => void): unknown;
  removeListener(
    event: 'request',
    listener: (request: PerfRequest) => void,
  ): unknown;
  removeListener(
    event: 'response',
    listener: (response: PerfResponse) => void,
  ): unknown;
};
