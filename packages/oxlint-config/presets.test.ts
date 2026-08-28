import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

/**
 * These presets are loaded by oxlint, not by us, so nothing in this package's
 * own type-checking proves a rule name is real or that a severity survives into
 * the effective config. That gap is what let a boundary ship at a severity
 * oxlint cannot fail on, and a `react-hooks` plugin ship without Rules of Hooks.
 *
 * So each preset is run through the real binary and asserted against
 * `--print-config`. oxlint hard-errors on an unknown rule name, which makes a
 * clean load a genuine check on every name a preset mentions.
 *
 * The built output is what a consumer resolves through `exports`, so that — not
 * the TypeScript source — is what is exercised here.
 */

const requireFromTest = createRequire(import.meta.url);
const packageDir = path.dirname(fileURLToPath(import.meta.url));

const oxlintBinary = path.join(
  path.dirname(requireFromTest.resolve('oxlint/package.json')),
  'bin/oxlint',
);

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oxlint-preset-'));
afterAll(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

/** The effective config oxlint derives from a preset, as it ships in `dist`. */
function effectiveConfig(preset: string): Record<string, unknown> {
  const distPath = path.join(packageDir, 'dist', `${preset}.js`);
  expect(
    fs.existsSync(distPath),
    `${preset} is not built — run \`npm run build\` in this package first`,
  ).toBe(true);

  const configPath = path.join(tmpDir, `${preset}.config.ts`);
  fs.writeFileSync(
    configPath,
    `import cfg from ${JSON.stringify(distPath)};\nexport default cfg;\n`,
  );

  // Throws on a non-zero exit, which is what an unknown rule name produces.
  const printed = execFileSync(
    oxlintBinary,
    ['-c', configPath, '--print-config'],
    { cwd: tmpDir, encoding: 'utf8' },
  );

  return JSON.parse(printed) as Record<string, unknown>;
}

function rules(preset: string): Record<string, unknown> {
  const config = effectiveConfig(preset);
  return (config.rules ?? {}) as Record<string, unknown>;
}

/** oxlint reports a configured severity as `deny`/`warn`/`allow`. */
function severityOf(entry: unknown): unknown {
  return Array.isArray(entry) ? entry[0] : entry;
}

describe('preset smoke tests', () => {
  it.each(['base', 'react', 'design-system-boundaries', 'type-aware'])(
    '%s loads and every rule name it mentions is real',
    (preset) => {
      expect(() => effectiveConfig(preset)).not.toThrow();
    },
  );

  it('base denies import cycles', () => {
    expect(severityOf(rules('base')['import/no-cycle'])).toBe('deny');
  });

  it('react denies Rules of Hooks', () => {
    // The plugin was declared while the rule sat under `pedantic`, which the
    // preset's categories never reach — so it was absent entirely.
    expect(severityOf(rules('react')['react/rules-of-hooks'])).toBe('deny');
  });

  it('react inherits base rules rather than replacing them', () => {
    expect(severityOf(rules('react')['import/no-cycle'])).toBe('deny');
  });

  it('design-system-boundaries denies the ark-ui import, not warns', () => {
    // At `warn` this rule cannot fail a run: oxlint exits 0 on warnings unless
    // the caller opts in, so the boundary was decorative.
    const entry = rules('design-system-boundaries')['no-restricted-imports'];
    expect(severityOf(entry)).toBe('deny');
    // A bare severity would have replaced the whole entry and dropped these.
    expect(JSON.stringify(entry)).toContain('@ark-ui/react');
  });

  it.each([
    'typescript/no-floating-promises',
    'typescript/no-misused-promises',
    'typescript/await-thenable',
    'typescript/no-base-to-string',
  ])('type-aware denies %s', (rule) => {
    expect(severityOf(rules('type-aware')[rule])).toBe('deny');
  });

  it.each([
    'typescript/no-unsafe-type-assertion',
    'typescript/consistent-return',
    'typescript/no-unnecessary-type-assertion',
    'typescript/no-unnecessary-type-parameters',
  ])('type-aware leaves the noisier %s off', (rule) => {
    expect(severityOf(rules('type-aware')[rule])).toBe('allow');
  });
});
