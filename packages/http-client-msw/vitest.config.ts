import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Node environment on purpose: the specs drive handlers through msw's
    // `setupServer`, which is the same handler array a browser worker would
    // serve. The browser entry's own logic is factored into pure functions
    // (see src/worker-options.ts) so it is testable without a service worker.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
