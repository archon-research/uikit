import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { build, type Rolldown } from 'vite';
import { afterAll, describe, expect, it } from 'vitest';

import reactCompiler, {
  DEFAULT_EXCLUDE,
  type ReactCompilerOptions,
} from './dist/react-compiler.js';

/**
 * The failure mode this preset exists to prevent is silent: a filter that never
 * matches, or a preset Vite accepts and never runs, produces a build that is
 * bit-for-bit the unoptimized one and reports no error at all. Type-checking
 * cannot see it, because the wrong wiring type-checks.
 *
 * So every assertion here is made against real output from a real `vite build`:
 * a component the compiler has work to do on must come out carrying a memo
 * cache, and an excluded one must come out untouched.
 *
 * `dist` is what a consumer resolves through `exports`, so that — not the
 * TypeScript source — is what is exercised here.
 */

const fixtureRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures/react-compiler',
);

/** Temporary fixture copies, removed once the suite is done with them. */
const tempRoots: string[] = [];

afterAll(() => {
  for (const root of tempRoots)
    fs.rmSync(root, { recursive: true, force: true });
});

/**
 * A copy of the fixture tree under a path containing `segment`, for asserting
 * that the exclusion does not depend on where the project happens to sit.
 */
function fixtureCopyUnder(segment: string): string {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'vite-config-'));
  tempRoots.push(base);
  const root = path.join(base, segment, 'fixture');
  fs.mkdirSync(root, { recursive: true });
  fs.cpSync(fixtureRoot, root, { recursive: true });
  return root;
}

/** The single chunk of a library build over the fixture entry. */
async function bundleFixture(
  options: ReactCompilerOptions = {},
  root: string = fixtureRoot,
): Promise<string> {
  const output = await build({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [react(), reactCompiler(options)],
    build: {
      write: false,
      minify: false,
      lib: { entry: 'entry.tsx', formats: ['es'], fileName: 'bundle' },
      // React is never loaded, only imported from, so nothing has to resolve.
      rolldownOptions: {
        external: [
          'react',
          'react/jsx-runtime',
          // A fixture copy lives outside this package, where React is not
          // resolvable at all — so the dev runtime has to be named too.
          'react/jsx-dev-runtime',
          'react/compiler-runtime',
          // Where an older `compiler.target` sends the runtime import instead.
          'react-compiler-runtime',
        ],
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

/** `c(n)` allocates the memo cache, so its presence is "the compiler ran here". */
const MEMO_CACHE = /=\s*c\(\d+\)/;

/**
 * Asserted per module rather than over the whole chunk, because one compiled
 * module would otherwise cover for an exclude filter that excludes nothing.
 */
function expectCompiled(code: string, suffix: string): void {
  expect(moduleBody(code, suffix), `${suffix} was not compiled`).toMatch(
    MEMO_CACHE,
  );
}

function expectNotCompiled(code: string, suffix: string): void {
  expect(moduleBody(code, suffix), `${suffix} was compiled`).not.toMatch(
    MEMO_CACHE,
  );
}

describe('react-compiler preset', () => {
  it('compiles a component and leaves the excluded tree alone', async () => {
    const code = await bundleFixture();

    // The compiler's runtime import is the one unambiguous marker that it ran:
    // nothing in the fixture sources mentions it.
    expect(code).toContain('react/compiler-runtime');

    expectCompiled(code, 'Component.tsx');
    expectNotCompiled(code, 'styled-system/Excluded.tsx');
  });

  it('still compiles the components Panda generates under styled-system/jsx', async () => {
    // The one part of Panda's output that holds components. Excluding it would
    // be silent and, since `exclude` only ever adds, unfixable by a consumer.
    expectCompiled(await bundleFixture(), 'jsx/Factory.tsx');
  });

  it('excludes a tree named by options.exclude', async () => {
    // Compiled by default — which is what stops the assertion below from
    // passing for a module the build never reached in the first place.
    expectCompiled(await bundleFixture(), 'generated/Generated.tsx');

    const code = await bundleFixture({ exclude: [/[/\\]generated[/\\]/] });
    expectNotCompiled(code, 'generated/Generated.tsx');
    expectCompiled(code, 'Component.tsx');
  });

  it('forwards options.compiler to the compiler itself', async () => {
    // `target` is the observable one: on an older React the compiler emits its
    // runtime import from the standalone package rather than from React.
    const code = await bundleFixture({ compiler: { target: '18' } });

    expect(code).toContain('react-compiler-runtime');
    expect(code).not.toContain('"react/compiler-runtime"');
    expectCompiled(code, 'Component.tsx');
  });

  it('excludes the same trees under a dot-segment path', async () => {
    // Nothing about the exclusion should depend on where the project sits.
    // Both dot placements are covered: one high in the path, one directly
    // above the fixture.
    for (const segment of ['.cache', path.join('deep', '.pnpm')]) {
      const code = await bundleFixture({}, fixtureCopyUnder(segment));
      expectCompiled(code, 'Component.tsx');
      expectNotCompiled(code, 'styled-system/Excluded.tsx');
    }
  });

  it('states the defaults in the form both id matchers agree on', () => {
    // The case above cannot see this, and neither can any build: two matchers
    // compile these patterns, and only rolldown's own — the dot-aware one —
    // decides which modules reach Babel through this wiring. The other,
    // `@rolldown/plugin-babel`'s bare `picomatch(pattern)`, is dot-blind, and
    // is authoritative on its own down the plugin's other filter path. So a
    // glob here is right only by way of which gate happens to decide.
    //
    // A `RegExp` is `pattern.test(id)` on both sides. Assert the form rather
    // than the outcome, since the outcome is what hides the difference.
    for (const pattern of DEFAULT_EXCLUDE)
      expect(pattern).toBeInstanceOf(RegExp);

    const dotted = '/home/u/.cache/app/styled-system/css/index.mjs';
    expect(
      DEFAULT_EXCLUDE.some(
        (pattern) => pattern instanceof RegExp && pattern.test(dotted),
      ),
    ).toBe(true);
  });
});
