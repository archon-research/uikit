import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // The browser-backed spec launches Chromium, loads a page that deliberately
    // blocks the main thread for hundreds of milliseconds, and does it several
    // times over. The default 5s per test is not enough for that on a cold
    // browser start.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
