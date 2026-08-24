/**
 * Latency is what makes a mock exercise the states a real API forces an app
 * through — pending spinners, skeletons, optimistic UI, race conditions. The same
 * latency in a test suite is dead time, so the amount is per-environment and the
 * default under test is none.
 */

export type MockDelayInput =
  | number
  | {
      /** Milliseconds under test. Defaults to `0`. */
      test?: number;
      /** Milliseconds everywhere else. Defaults to `0`. */
      dev?: number;
    };

/**
 * True when running under a test runner: `NODE_ENV === 'test'` (vitest, jest) or
 * Vite's `MODE === 'test'`. Read defensively because neither `process` nor
 * `import.meta.env` exists in every environment this package runs in.
 */
export function isTestEnvironment(): boolean {
  // `process.env` is optional-chained as well as guarded: a browser shim that
  // defines `process` without an `env` would otherwise throw from inside a
  // request handler. The dot form is deliberate — it is what bundlers rewrite.
  const nodeEnv =
    typeof process === 'undefined' ? undefined : process.env?.NODE_ENV;
  const viteMode = (import.meta as ImportMeta & { env?: { MODE?: string } }).env
    ?.MODE;

  return nodeEnv === 'test' || viteMode === 'test';
}

/** The pure resolution `mockDelay` applies, split out so both branches are testable. */
export function resolveMockDelay(
  input: MockDelayInput,
  isTest: boolean,
): number {
  if (typeof input === 'number') return isTest ? 0 : input;

  return (isTest ? input.test : input.dev) ?? 0;
}

/**
 * Waits, in dev; resolves immediately under test unless a test delay is asked
 * for.
 *
 * ```ts
 * mock.get('/things', async ({ response }) => {
 *   await mockDelay(400);
 *   return response(200).json(things.list());
 * });
 *
 * // Keep a little latency under test, for a pending-state assertion.
 * await mockDelay({ dev: 400, test: 10 });
 * ```
 */
export function mockDelay(input: MockDelayInput = 0): Promise<void> {
  const ms = resolveMockDelay(input, isTestEnvironment());

  // No timer at all for a zero delay: a mock that resolves in the same
  // microtask keeps a suite's timing behaviour unchanged.
  if (ms <= 0) return Promise.resolve();

  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
