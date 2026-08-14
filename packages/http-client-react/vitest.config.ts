import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Node environment is sufficient: the query layer is plain logic over
    // key derivation, a middleware chain, and a QueryClient — the specs drive
    // it directly with an injected `fetch` rather than rendering a component.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
