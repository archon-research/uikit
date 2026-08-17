import { describe, expect, it, vi } from 'vitest';

import {
  buildWorkerStartOptions,
  createIdempotentStart,
} from './worker-options.js';

describe('buildWorkerStartOptions', () => {
  it('bypasses unhandled requests and stays quiet by default', () => {
    expect(buildWorkerStartOptions()).toEqual({
      onUnhandledRequest: 'bypass',
      quiet: true,
      serviceWorker: { url: '/mockServiceWorker.js' },
    });
  });

  it('resolves the worker script under the app base path', () => {
    expect(buildWorkerStartOptions({ baseUrl: '/app/' }).serviceWorker).toEqual(
      {
        url: '/app/mockServiceWorker.js',
      },
    );
  });

  it('honours explicit overrides', () => {
    expect(
      buildWorkerStartOptions({ onUnhandledRequest: 'warn', quiet: false }),
    ).toMatchObject({ onUnhandledRequest: 'warn', quiet: false });
  });

  it('lets the start escape hatch win, including the script url', () => {
    expect(
      buildWorkerStartOptions({
        baseUrl: '/app/',
        start: {
          onUnhandledRequest: 'error',
          serviceWorker: { url: '/custom/worker.js' },
        },
      }),
    ).toEqual({
      onUnhandledRequest: 'error',
      quiet: true,
      serviceWorker: { url: '/custom/worker.js' },
    });
  });

  it('keeps the resolved script url when start sets other worker options', () => {
    expect(
      buildWorkerStartOptions({
        baseUrl: '/app',
        start: { serviceWorker: { options: { scope: '/app' } } },
      }).serviceWorker,
    ).toEqual({ url: '/app/mockServiceWorker.js', options: { scope: '/app' } });
  });
});

describe('createIdempotentStart', () => {
  it('registers once across repeated calls', async () => {
    const start = vi.fn(() => Promise.resolve());
    const startOnce = createIdempotentStart(start);

    await Promise.all([startOnce(), startOnce()]);
    await startOnce();

    expect(start).toHaveBeenCalledTimes(1);
  });

  it('returns the same promise to concurrent callers', () => {
    const startOnce = createIdempotentStart(() => Promise.resolve());

    expect(startOnce()).toBe(startOnce());
  });

  it('allows a retry after a failed start', async () => {
    const start = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('no worker script'))
      .mockResolvedValueOnce(undefined);
    const startOnce = createIdempotentStart(start);

    await expect(startOnce()).rejects.toThrow('no worker script');
    await expect(startOnce()).resolves.toBeUndefined();

    expect(start).toHaveBeenCalledTimes(2);
  });
});
