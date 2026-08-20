import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Node environment on purpose: every spec drives the router headlessly
    // through `createMemoryHistory` and `matchRoutes`, which is also how the
    // settle harness this package ships works. Nothing renders, so no jsdom.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
