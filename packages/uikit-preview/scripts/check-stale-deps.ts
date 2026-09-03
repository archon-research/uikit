#!/usr/bin/env node
// Fail if any workspace package the preview renders has sources newer than its
// compiled `dist/` — i.e. the preview would bundle a stale build of it.
//
// This package imports `@archon-research/*` through each package's `exports`,
// which resolve to `dist/`. Ladle bundles that compiled output; it never sees
// the package's `src/`. So editing a component and re-rendering without
// rebuilding that package renders the PREVIOUS component — which of course
// matches the PREVIOUS baseline. A real visual change then passes a snapshot
// run that asserted nothing, and `--update-snapshots` rewrites nothing because
// nothing differed. Silent under-update, reported as success.
//
// `snapshot:update` and Playwright's `webServer` both build the whole workspace
// to make that impossible; this check is what proves the build actually
// happened, so the guarantee cannot quietly rot back (CI runs it between its
// build and render steps).
//
// Cheap and render-free, in the spirit of check-orphan-snapshots: no build, no
// browser, just stat(2). Every package below builds with `tsc -p` and no
// `incremental`, which emits every output on every run — so a build always
// leaves `dist/` newer than `src/`, and a failure here means a build was
// skipped rather than that timestamps drifted.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const packageDir = process.cwd();
const repoRoot = path.resolve(packageDir, '..', '..');
const PACKAGES_DIR = path.join(repoRoot, 'packages');

/** Sources excluded from `tsconfig.build.json`, so absent from `dist/`. */
const NOT_COMPILED = /\.test\.[cm]?[jt]sx?$/;

type PackageJson = {
  name?: unknown;
  dependencies?: unknown;
  scripts?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readPackageJson = (dir: string): PackageJson | null => {
  let raw: string;
  try {
    raw = readFileSync(path.join(dir, 'package.json'), 'utf8');
  } catch {
    return null;
  }
  const parsed: unknown = JSON.parse(raw);
  return isRecord(parsed) ? parsed : null;
};

const dependencyNames = (pkg: PackageJson): string[] =>
  isRecord(pkg.dependencies) ? Object.keys(pkg.dependencies) : [];

/** Every workspace package, indexed by its published name. */
const dirsByName = new Map<string, string>();
for (const entry of readdirSync(PACKAGES_DIR, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const dir = path.join(PACKAGES_DIR, entry.name);
  const pkg = readPackageJson(dir);
  if (typeof pkg?.name === 'string') dirsByName.set(pkg.name, dir);
}

/** The newest file under `dir`, or null when the tree is missing or empty. */
const newest = (
  dir: string,
  skip: (file: string) => boolean = () => false,
): { mtimeMs: number; file: string } | null => {
  let found: { mtimeMs: number; file: string } | null = null;
  const walk = (current: string) => {
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return; // unreadable or gone; treated as "no output"
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && !skip(full)) {
        const { mtimeMs } = statSync(full);
        if (!found || mtimeMs > found.mtimeMs) found = { mtimeMs, file: full };
      }
    }
  };
  walk(dir);
  return found;
};

const rel = (file: string) =>
  path.relative(repoRoot, file).split(path.sep).join('/');

// Walk this package's runtime dependencies transitively. devDependencies are
// excluded on purpose: tooling and the demo-relay harness are never bundled
// into a rendered story, so their build state cannot change a pixel.
const previewPkg = readPackageJson(packageDir);
if (!previewPkg) throw new Error(`No package.json in ${packageDir}`);

const rendered = new Set<string>();
const queue = dependencyNames(previewPkg);
while (queue.length > 0) {
  const name = queue.pop() as string;
  if (rendered.has(name)) continue;
  const dir = dirsByName.get(name);
  if (!dir) continue; // third-party dependency, not a workspace package
  rendered.add(name);
  const pkg = readPackageJson(dir);
  if (pkg) queue.push(...dependencyNames(pkg));
}

type Stale = { name: string; source: string; output: string | null };
const stale: Stale[] = [];

for (const name of [...rendered].sort()) {
  const dir = dirsByName.get(name);
  if (!dir) continue;
  const pkg = readPackageJson(dir);
  // Only packages that compile to dist/ can be stale.
  if (!isRecord(pkg?.scripts) || typeof pkg.scripts.build !== 'string')
    continue;

  const newestSource = newest(path.join(dir, 'src'), (file) =>
    NOT_COMPILED.test(file),
  );
  if (!newestSource) continue; // nothing to compile

  const newestOutput = newest(path.join(dir, 'dist'));
  if (!newestOutput || newestSource.mtimeMs > newestOutput.mtimeMs) {
    stale.push({
      name,
      source: rel(newestSource.file),
      output: newestOutput ? rel(newestOutput.file) : null,
    });
  }
}

if (stale.length > 0) {
  console.error(
    `${stale.length} package(s) the preview renders are newer in src/ than in dist/:\n`,
  );
  for (const { name, source, output } of stale) {
    console.error(`  ${name}`);
    console.error(`    newest source: ${source}`);
    console.error(
      output === null
        ? '    compiled output: MISSING — this package has never been built'
        : `    newest output:  ${output} (older)`,
    );
  }
  console.error(
    '\nStories bundle dist/, not src/, so rendering now would show the previous\n' +
      'build of these packages: a real visual change would match its own stale\n' +
      'baseline and pass while asserting nothing. Build first:\n\n' +
      '  npm run build\n',
  );
  process.exit(1);
}

console.log(
  `All ${rendered.size} rendered workspace package(s) are built from current sources.`,
);
