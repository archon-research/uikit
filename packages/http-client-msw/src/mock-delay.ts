/**
 * Latency is what makes a mock exercise the states a real API forces an app
 * through — pending spinners, skeletons, optimistic UI, race conditions. The same
 * latency in a test suite is dead time, so the amount is per-environment and the
 * default under test is none.
 */

/**
 * ── Named latency profiles ──
 *
 * The numbers are Chrome DevTools' own network-throttling presets, taken
 * verbatim from the `latency` field of each preset in the DevTools frontend
 * (`front_end/core/sdk/NetworkManager.ts`). Borrowed rather than invented so
 * that "does this screen hold up on a slow connection?" means the same thing
 * here as it does in the Network panel's throttling dropdown, and so the numbers
 * can be checked against a source instead of taken on trust.
 *
 * | Profile   | DevTools preset | `latency`                      |
 * | --------- | --------------- | ------------------------------ |
 * | `fast`    | Fast 4G         | `60 * 2.75` = 165 ms           |
 * | `typical` | Slow 4G         | `150 * 3.75` = 562.5 ms        |
 * | `slow`    | Slow 3G         | `400 * 5` = 2000 ms            |
 * | `offline` | Offline         | no network at all — see below  |
 *
 * `typical` is the middle profile because Slow 4G is what Lighthouse throttles
 * to by default when it scores a page, so it is already the condition the web's
 * most-quoted performance number is measured under. The fractional 562.5 is kept
 * exactly as DevTools writes it — a rounded 563 would be no more accurate and
 * would lose the provenance.
 *
 * These describe the **network round trip only**. A real endpoint also spends
 * time thinking, so a mock that wants to resemble one adds its own server time:
 * `MOCK_LATENCY_PROFILES.typical + 120`.
 *
 * OFFLINE IS NOT AN ERROR. `offline` resolves to `Infinity`, and a request
 * delayed by it never settles — the black-holed connection of a captive portal,
 * a dropped VPN, or a server that accepted the socket and went away. That is the
 * state apps handle worst, because a `catch` never runs and only a timeout ever
 * ends it. It is deliberately *not* the browser's own offline behaviour, which
 * is an immediate network error; for that, return `HttpResponse.error()` from
 * the handler, which is a response rather than a latency.
 */
export const MOCK_LATENCY_PROFILES = {
  /** Chrome DevTools "Fast 4G": 165 ms. */
  fast: 165,
  /** Chrome DevTools "Slow 4G": 562.5 ms — Lighthouse's default throttling. */
  typical: 562.5,
  /** Chrome DevTools "Slow 3G": 2000 ms. */
  slow: 2000,
  /** Never settles. See the note above: a stall, not an error. */
  offline: Number.POSITIVE_INFINITY,
} as const satisfies Record<string, number>;

/** The name of a {@link MOCK_LATENCY_PROFILES} entry. */
export type MockLatencyProfile = keyof typeof MOCK_LATENCY_PROFILES;

/** A delay written either as milliseconds or as a profile name. */
export type MockDelayAmount = number | MockLatencyProfile;

export type MockDelayInput =
  | MockDelayAmount
  | {
      /** Milliseconds, or a profile name, under test. Defaults to `0`. */
      test?: MockDelayAmount;
      /** Milliseconds, or a profile name, everywhere else. Defaults to `0`. */
      dev?: MockDelayAmount;
    };

/** Milliseconds for a delay written either way. */
function amountToMs(amount: MockDelayAmount): number {
  return typeof amount === 'number' ? amount : MOCK_LATENCY_PROFILES[amount];
}

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

/**
 * The pure resolution `mockDelay` applies, split out so both branches are
 * testable.
 *
 * A bare profile name follows the same rule as a bare number — it is a dev-only
 * delay, and resolves to `0` under test. That includes `'offline'`: a handler
 * written `mockDelay('offline')` does not hang a suite. To hold a request
 * pending in a test, ask for it on both sides: `{ dev: 'offline', test:
 * 'offline' }`.
 */
export function resolveMockDelay(
  input: MockDelayInput,
  isTest: boolean,
): number {
  if (typeof input === 'number' || typeof input === 'string') {
    return isTest ? 0 : amountToMs(input);
  }

  const amount = isTest ? input.test : input.dev;

  return amount === undefined ? 0 : amountToMs(amount);
}

/**
 * Waits, in dev; resolves immediately under test unless a test delay is asked
 * for.
 *
 * ```ts
 * mock.get('/things', async ({ response }) => {
 *   await mockDelay('typical');
 *   return response(200).json(things.list());
 * });
 *
 * // Keep a little latency under test, for a pending-state assertion.
 * await mockDelay({ dev: 'slow', test: 10 });
 *
 * // A profile plus the server's own think time.
 * await mockDelay(MOCK_LATENCY_PROFILES.typical + 120);
 * ```
 */
export function mockDelay(input: MockDelayInput = 0): Promise<void> {
  const ms = resolveMockDelay(input, isTestEnvironment());

  // No timer at all for a zero delay: a mock that resolves in the same
  // microtask keeps a suite's timing behaviour unchanged.
  if (ms <= 0) return Promise.resolve();

  // `offline`. A pending promise with no timer behind it, rather than a very
  // large `setTimeout` — a delay that does not fit a 32-bit signed integer is
  // not a long wait, it is clamped to 1 ms (node says so out loud:
  // `TimeoutOverflowWarning: Infinity does not fit into a 32-bit signed
  // integer. Timeout duration was set to 1.`). Handing `Infinity` to a timer
  // would turn the one profile that must never resolve into the fastest one
  // there is.
  if (ms === Number.POSITIVE_INFINITY) return new Promise<void>(() => {});

  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
