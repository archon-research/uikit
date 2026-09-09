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
  it.each([
    'base',
    'react',
    'react-strict',
    'design-system-boundaries',
    'type-aware',
  ])('%s loads and every rule name it mentions is real', (preset) => {
    expect(() => effectiveConfig(preset)).not.toThrow();
  });

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

  it.each(['typescript/no-explicit-any', 'react/only-export-components'])(
    'react-strict denies %s',
    (rule) => {
      // Both sit in oxlint's `restriction` category, which the `correctness` +
      // `suspicious` categories inherited from `base` never reach — so naming
      // them is the only thing that turns them on.
      expect(severityOf(rules('react-strict')[rule])).toBe('deny');
    },
  );

  it('react-strict keeps only-export-components options alongside the severity', () => {
    // A bare severity would replace the entry and silently drop the option,
    // which is the failure mode the README warns consumers about.
    const entry = rules('react-strict')['react/only-export-components'];
    expect(JSON.stringify(entry)).toContain('allowConstantExport');
  });

  it('react-strict leaves the base and react presets it composes on intact', () => {
    const strict = rules('react-strict');
    expect(severityOf(strict['import/no-cycle'])).toBe('deny');
    expect(severityOf(strict['react/rules-of-hooks'])).toBe('deny');
  });

  it('react does not carry the react-strict rules', () => {
    // The whole reason this entrypoint exists: these two stay opt-in. If they
    // ever leak into `react`, every consumer takes them by default.
    const base = rules('react');
    expect(severityOf(base['typescript/no-explicit-any'])).not.toBe('deny');
    expect(severityOf(base['react/only-export-components'])).not.toBe('deny');
  });

  // The presets are plain object literals, so `severity` infers as `string` and
  // a typo like `'eror'` type-checks. The reason that is not worth a local
  // severity type is that oxlint refuses to load the config at all, so the typo
  // cannot reach a consumer as a quietly disabled rule — it fails their lint run
  // outright, and it fails the smoke tests above, which go through the same
  // parser.
  //
  // Both accepted shapes are covered rather than asserted in prose, since this
  // file's whole point is that a claim about the effective config belongs in a
  // test. The valid-array control matters too: without it, the array case could
  // pass because oxlint rejected the SHAPE rather than the severity.
  it.each([
    ['scalar', `'eror'`],
    ['[severity, options]', `['eror', { ignoreRestArgs: true }]`],
  ])('rejects a misspelled severity in the %s form', (_label, entry) => {
    const configPath = path.join(
      tmpDir,
      `misspelled-severity-${_label.replace(/\W+/g, '-')}.config.ts`,
    );
    fs.writeFileSync(
      configPath,
      `export default {\n  plugins: ['typescript'],\n  rules: { 'typescript/no-explicit-any': ${entry} },\n};\n`,
    );

    let stdout = '';
    expect(() => {
      try {
        execFileSync(oxlintBinary, ['-c', configPath, '--print-config'], {
          cwd: tmpDir,
          encoding: 'utf8',
          stdio: 'pipe',
        });
      } catch (error) {
        stdout = String((error as { stdout?: string }).stdout ?? '');
        throw error;
      }
    }).toThrow();

    // Asserted so the test cannot pass for some unrelated non-zero exit.
    expect(stdout).toContain('Failed to parse rule severity');
  });

  it('accepts the same array entry with a valid severity', () => {
    // Control for the case above: proves the rejection is about the severity,
    // not about the `[severity, options]` shape being unsupported.
    const configPath = path.join(tmpDir, 'valid-severity-array.config.ts');
    fs.writeFileSync(
      configPath,
      `export default {\n  plugins: ['typescript'],\n  rules: { 'typescript/no-explicit-any': ['error', { ignoreRestArgs: true }] },\n};\n`,
    );

    const stdout = execFileSync(
      oxlintBinary,
      ['-c', configPath, '--print-config'],
      { cwd: tmpDir, encoding: 'utf8', stdio: 'pipe' },
    );
    expect(
      severityOf(JSON.parse(stdout).rules['typescript/no-explicit-any']),
    ).toBe('deny');
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
