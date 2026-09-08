import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Node by default — nearly every suite here exercises a pure decision core,
    // or only imports modules and inspects exports; it never renders. Ark UI is
    // SSR-safe, so importing the barrel touches no DOM at module load.
    // The suites that do need a DOM opt into jsdom with a `@vitest-environment`
    // docblock: `ThemeProvider.test.ts` (the pre-paint bootstrap read-back is
    // only observable in a real first render) and the `renderHook` suites for
    // `usePlayback` and `useTransportHotkeys` (both pin behaviour that only
    // exists across successive commits).
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
