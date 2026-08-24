import { describe, expect, it } from 'vitest';

import {
  isTestEnvironment,
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
});
