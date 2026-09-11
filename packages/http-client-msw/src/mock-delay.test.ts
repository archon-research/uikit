import { describe, expect, it } from 'vitest';

import {
  isTestEnvironment,
  MOCK_LATENCY_PROFILES,
  mockDelay,
  resolveMockDelay,
} from './mock-delay.js';

describe('resolveMockDelay', () => {
  it('skips a plain delay under test and honours it elsewhere', () => {
    expect(resolveMockDelay(400, true)).toBe(0);
    expect(resolveMockDelay(400, false)).toBe(400);
  });

  it('takes the per-environment value from an object', () => {
    expect(resolveMockDelay({ dev: 400, test: 10 }, true)).toBe(10);
    expect(resolveMockDelay({ dev: 400, test: 10 }, false)).toBe(400);
  });

  it('defaults an unspecified environment to no delay', () => {
    expect(resolveMockDelay({ dev: 400 }, true)).toBe(0);
    expect(resolveMockDelay({ test: 10 }, false)).toBe(0);
    expect(resolveMockDelay({}, false)).toBe(0);
  });
});

describe('latency profiles', () => {
  it('carries the Chrome DevTools throttling latencies verbatim', () => {
    // Fast 4G `60 * 2.75`, Slow 4G `150 * 3.75`, Slow 3G `400 * 5` — the
    // `latency` field of each preset in the DevTools frontend. Asserted so a
    // later edit to these numbers has to be a deliberate one, made against the
    // same source rather than to taste.
    expect(MOCK_LATENCY_PROFILES.fast).toBe(60 * 2.75);
    expect(MOCK_LATENCY_PROFILES.typical).toBe(150 * 3.75);
    expect(MOCK_LATENCY_PROFILES.slow).toBe(400 * 5);
    expect(MOCK_LATENCY_PROFILES.offline).toBe(Number.POSITIVE_INFINITY);
  });

  it('orders the profiles as their names claim', () => {
    const { fast, typical, slow, offline } = MOCK_LATENCY_PROFILES;
    expect(fast).toBeLessThan(typical);
    expect(typical).toBeLessThan(slow);
    expect(slow).toBeLessThan(offline);
  });

  it('resolves a profile name the same way it resolves a number', () => {
    expect(resolveMockDelay('typical', false)).toBe(
      MOCK_LATENCY_PROFILES.typical,
    );
    expect(resolveMockDelay('slow', false)).toBe(MOCK_LATENCY_PROFILES.slow);
    expect(resolveMockDelay({ dev: 'slow', test: 'fast' }, false)).toBe(
      MOCK_LATENCY_PROFILES.slow,
    );
    expect(resolveMockDelay({ dev: 'slow', test: 'fast' }, true)).toBe(
      MOCK_LATENCY_PROFILES.fast,
    );
  });

  it('zeroes a bare profile under test, like a bare number', () => {
    // The trap this pins down: `mockDelay('offline')` must not hang a suite.
    expect(resolveMockDelay('slow', true)).toBe(0);
    expect(resolveMockDelay('offline', true)).toBe(0);
  });

  it('mixes a profile with a plain number across environments', () => {
    expect(resolveMockDelay({ dev: 'slow', test: 10 }, true)).toBe(10);
    expect(resolveMockDelay({ dev: 400, test: 'fast' }, true)).toBe(
      MOCK_LATENCY_PROFILES.fast,
    );
  });
});

describe('isTestEnvironment', () => {
  it('detects the runner this suite is running under', () => {
    expect(isTestEnvironment()).toBe(true);
  });
});

describe('mockDelay', () => {
  it('resolves without a timer under test', async () => {
    const startedAt = Date.now();
    await mockDelay(5_000);

    expect(Date.now() - startedAt).toBeLessThan(1_000);
  });

  it('still waits when a test delay is asked for', async () => {
    const startedAt = Date.now();
    await mockDelay({ dev: 5_000, test: 20 });

    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(15);
  });

  it('resolves immediately with no argument', async () => {
    await expect(mockDelay()).resolves.toBeUndefined();
  });

  it('never settles when offline is asked for on both sides', async () => {
    // The `Infinity` branch. A 32-bit overflow would clamp the timer to 1 ms,
    // so racing against a real timer is what tells a never-settling promise
    // apart from a very fast one.
    const pending = mockDelay({ dev: 'offline', test: 'offline' });
    const settled = await Promise.race([
      pending.then(() => 'settled' as const),
      new Promise<'still-pending'>((resolve) => {
        setTimeout(() => resolve('still-pending'), 50);
      }),
    ]);

    expect(settled).toBe('still-pending');
  });
});
