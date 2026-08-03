import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // jsdom, not the design-system package's `node` environment: the
    // interaction-store test renders components (via
    // `@testing-library/react`) to prove a per-key subscriber does not
    // re-render on an unrelated key's update, which needs a DOM.
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
