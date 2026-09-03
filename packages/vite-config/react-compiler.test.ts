import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { build, type Rolldown } from 'vite';
import { describe, expect, it } from 'vitest';

import reactCompiler from './dist/react-compiler.js';

/**
 * The failure mode this preset exists to prevent is silent: a filter that never
 * matches, or a preset Vite accepts and never runs, produces a build that is
 * bit-for-bit the unoptimized one and reports no error at all. Type-checking
 * cannot see it, because the wrong wiring type-checks.
 *
 * So the assertion is made against real output from a real `vite build`: a
 * component the compiler has work to do on must come out carrying a memo cache,
 * and an excluded one must come out untouched.
 *
 * `dist` is what a consumer resolves through `exports`, so that — not the
 * TypeScript source — is what is exercised here.
 */

const fixtureRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures/react-compiler',
);

/** The single chunk of a library build over the fixture entry. */
async function bundleFixture(): Promise<string> {
  const output = await build({
    root: fixtureRoot,
    configFile: false,
    logLevel: 'silent',
    plugins: [react(), reactCompiler()],
    build: {
      write: false,
      minify: false,
      lib: { entry: 'entry.tsx', formats: ['es'], fileName: 'bundle' },
      // React is never loaded, only imported from, so nothing has to resolve.
      rolldownOptions: {
        external: ['react', 'react/jsx-runtime', 'react/compiler-runtime'],
      },
    },
  });

  const outputs = (output as Rolldown.RolldownOutput[]).flatMap(
    (result) => result.output,
  );
  const chunks = outputs.filter((chunk) => chunk.type === 'chunk');
  expect(chunks).toHaveLength(1);
  return chunks[0]!.code;
}

/**
 * The body of one `//#region <file>` block rolldown emits per module. Matched
 * on the tail of the id, since rolldown writes it relative to the cwd rather
 * than to `root`.
 */
function moduleBody(code: string, suffix: string): string {
  const blocks = code.split('//#region ').slice(1);
  const block = blocks.find((candidate) =>
    candidate.slice(0, candidate.indexOf('\n')).endsWith(suffix),
  );
  expect(block, `no output region for ${suffix}`).toBeDefined();
  const end = block!.indexOf('//#endregion');
  return end === -1 ? block! : block!.slice(0, end);
}

describe('react-compiler preset', () => {
  it('compiles a component and leaves the excluded tree alone', async () => {
    const code = await bundleFixture();

    // The compiler's runtime import is the one unambiguous marker that it ran:
    // nothing in the fixture sources mentions it.
    expect(code).toContain('react/compiler-runtime');

    // `c(n)` allocates the memo cache. Asserted per module rather than over the
    // whole chunk, because one compiled module would otherwise cover for an
    // exclude filter that excludes nothing.
    expect(moduleBody(code, 'Component.tsx')).toMatch(/=\s*c\(\d+\)/);
    expect(moduleBody(code, 'styled-system/Excluded.tsx')).not.toMatch(
      /=\s*c\(\d+\)/,
    );
  });
});
