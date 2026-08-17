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

  it('keeps the defaults when a forwarded start passes undefined', () => {
    expect(
      buildWorkerStartOptions({
        start: { onUnhandledRequest: undefined, quiet: undefined },
      }),
    ).toEqual({
      onUnhandledRequest: 'bypass',
      quiet: true,
      serviceWorker: { url: '/mockServiceWorker.js' },
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
    const run = vi.fn(() => Promise.resolve());
    const { start } = createIdempotentStart(run);

    await Promise.all([start(), start()]);
    await start();

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('returns the same promise to concurrent callers', () => {
    const { start } = createIdempotentStart(() => Promise.resolve());

    expect(start()).toBe(start());
  });

  it('allows a retry after a failed start', async () => {
    const run = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('no worker script'))
      .mockResolvedValueOnce(undefined);
    const { start } = createIdempotentStart(run);

    await expect(start()).rejects.toThrow('no worker script');
    await expect(start()).resolves.toBeUndefined();

    expect(run).toHaveBeenCalledTimes(2);
  });

  it('runs again after invalidate(), which is how stop() re-registers', async () => {
    const run = vi.fn(() => Promise.resolve());
    const { start, invalidate } = createIdempotentStart(run);

    await start();
    invalidate();
    await start();

    expect(run).toHaveBeenCalledTimes(2);
  });

  it('rejects rather than throwing when the start function throws synchronously', async () => {
    const { start } = createIdempotentStart(() => {
      throw new Error('registration is unavailable');
    });

    await expect(start()).rejects.toThrow('registration is unavailable');
  });
});
