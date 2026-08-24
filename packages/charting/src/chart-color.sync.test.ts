import { describe, expect, it } from 'vitest';

// Imported from SOURCE, by relative path, on purpose. Two constraints rule out
// the package specifier `@archon-research/design-system`:
//
//  1. Its `exports` map resolves to `dist/`, so this test would only pass after
//     the design system had been built. CI's test job builds only the packages
//     whose specs need it, and adding another such coupling is worse than a
//     path.
//  2. The design system is an OPTIONAL peer of this package. A real import in
//     `src/` would make it mandatory; this file is excluded from
//     `tsconfig.build.json`, so nothing reaches the published output.
import { chartColorTokenPaths } from '../../design-system/src/tokens/chartColorTokens.ts';
import { chartColorTokens } from './chart-color.js';

/**
 * `chartColorTokens` restates the design system's token names because charting
 * must produce `var(...)` strings (with fallbacks) without importing it — see
 * the rationale on that constant. This test is what keeps the restatement
 * honest: a token added, removed, or renamed upstream fails here rather than
 * silently leaving `ChartColorToken` describing a contract that no longer
 * exists.
 */
describe('chart color token parity with the design system', () => {
  it('covers exactly the design system’s token paths, in the same order', () => {
    expect(Object.keys(chartColorTokens)).toEqual(chartColorTokenPaths);
  });

  it('reads each token’s own custom property', () => {
    for (const path of chartColorTokenPaths) {
      const expectedVar = `--colors-${path.replaceAll('.', '-')}`;
      expect(chartColorTokens[path], path).toContain(`var(${expectedVar},`);
    }
  });
});
