#!/usr/bin/env node
// Emits `dist/theme-bootstrap.js` — the pre-paint theme bootstrap as a plain,
// standalone browser script.
//
// Why a build step instead of a checked-in file: consumers under a
// `script-src 'self'` CSP cannot inline `THEME_BOOTSTRAP_SCRIPT`, so they need
// the same code as a file they can copy into their public dir and load with
// `<script src>`. Generating it from the built module keeps one source of truth
// — the string that `ThemeProvider` shares its storage keys with — so the file
// can never drift from the inline form.
//
// `outFile` below is load-bearing beyond this script: the same path is the
// `./theme-bootstrap.js` export target and the lone entry in the package's
// `sideEffects` array, which is what stops a bundler tree-shaking away a
// side-effect-only `import '.../theme-bootstrap.js'`. Renaming it means editing
// both entries in package.json to match, or that import silently disappears
// from consumer bundles.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const errorCode = (error: unknown): string | undefined =>
  error instanceof Error && 'code' in error && typeof error.code === 'string'
    ? error.code
    : undefined;

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)));
const distDir = join(packageDir, 'dist');
const outFile = join(distDir, 'theme-bootstrap.js');

// The specifier is a runtime path, so this is deliberately untyped at the
// boundary; the guard below is what establishes it is a usable string.
const { THEME_BOOTSTRAP_SCRIPT } = (await import(
  join(distDir, 'theme', 'theme-bootstrap.js')
)) as { THEME_BOOTSTRAP_SCRIPT?: unknown };

if (typeof THEME_BOOTSTRAP_SCRIPT !== 'string' || !THEME_BOOTSTRAP_SCRIPT) {
  console.error('THEME_BOOTSTRAP_SCRIPT is missing or not a string.');
  process.exit(1);
}

const banner = `/**
 * Pre-paint theme bootstrap for @archon-research/design-system.
 *
 * GENERATED at package build time from src/theme/theme-bootstrap.ts — do not
 * edit. Load this as the first script in <head> when a CSP forbids inline
 * scripts; otherwise inline THEME_BOOTSTRAP_SCRIPT instead.
 */
`;

const contents = `${banner}${THEME_BOOTSTRAP_SCRIPT}`;

// Only write when the content actually changed, so a no-op rebuild doesn't
// churn the file's mtime and invalidate downstream caches.
let existing: string | null = null;
try {
  existing = readFileSync(outFile, 'utf8');
} catch (error) {
  // A missing file is the ordinary first-build case. Anything else — no read
  // permission, a directory sitting at that path, an I/O error — means the
  // comparison below would be meaningless, and swallowing it would turn a
  // broken build into a silent overwrite (or a silent skip). Re-throw.
  if (errorCode(error) !== 'ENOENT') {
    throw error;
  }
}

if (existing !== contents) {
  writeFileSync(outFile, contents, 'utf8');
}
