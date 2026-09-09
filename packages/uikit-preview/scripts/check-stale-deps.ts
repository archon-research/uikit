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
// leaves `dist/` newer than its inputs, and a failure here means a build was
// skipped rather than that timestamps drifted.
//
// Every ambiguity resolves towards reporting. Both call sites build first and
// check second, so a false "rebuild this" costs one warm build; a false "all
// fresh" is the silent under-update this file exists to prevent.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const packageDir = process.cwd();
const repoRoot = path.resolve(packageDir, '..', '..');

/**
 * Directory names that are never build INPUT: compiled output, installed
 * dependencies, Panda's generated `styled-system`, and test/report trees. Dot
 * directories (`.ladle`, `.turbo`) are skipped separately.
 */
const NOT_INPUT_DIRS = new Set([
  'dist',
  'node_modules',
  'styled-system',
  'coverage',
  'test-results',
  'playwright-report',
  'tests',
  '__snapshots__',
]);

/** Tests are not bundled into a story, and docs cannot change a pixel. */
const NOT_INPUT_FILES = /(\.test\.[cm]?[jt]sx?|\.md)$/;

type PackageJson = {
  name?: unknown;
  workspaces?: unknown;
  dependencies?: unknown;
  peerDependencies?: unknown;
  scripts?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const errorCode = (error: unknown): string | undefined =>
  error instanceof Error && 'code' in error && typeof error.code === 'string'
    ? error.code
    : undefined;

type Skip = (name: string) => boolean;
const skipNothing: Skip = () => false;

const readPackageJson = (dir: string): PackageJson | null => {
  let raw: string;
  try {
    raw = readFileSync(path.join(dir, 'package.json'), 'utf8');
  } catch {
    return null;
  }
  // A malformed manifest must not take the whole check down with a stack
  // trace; it is skipped like an unreadable one.
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return isRecord(parsed) ? parsed : null;
};

/**
 * Workspace edges, from `dependencies` AND `peerDependencies`.
 *
 * Peers are not optional here: `charting` declares `design-system` as a peer
 * with an empty `dependencies`, and `dashboard-kit` declares both of its
 * workspace edges as peers. Following `dependencies` alone reached all five
 * rendered packages only because `uikit-preview` happens to list every one of
 * them directly; the first rendered package to gain a workspace peer the
 * preview does not also list would drop out of this check silently.
 */
const dependencyNames = (pkg: PackageJson): string[] => [
  ...(isRecord(pkg.dependencies) ? Object.keys(pkg.dependencies) : []),
  ...(isRecord(pkg.peerDependencies) ? Object.keys(pkg.peerDependencies) : []),
];

/**
 * Every workspace package, indexed by its published name — from the root
 * `workspaces` array, the declared source of truth (and the array whose ORDER
 * `npm run build` follows). Scanning `packages/*` instead would let a
 * workspace added elsewhere, or a stray untracked directory, quietly change
 * what this guard covers.
 */
const workspaceDirs = (): string[] => {
  const root = readPackageJson(repoRoot);
  const patterns = Array.isArray(root?.workspaces)
    ? root.workspaces.filter((p): p is string => typeof p === 'string')
    : [];
  if (patterns.length === 0)
    throw new Error(`No workspaces array in ${repoRoot}/package.json`);

  const dirs: string[] = [];
  for (const pattern of patterns) {
    if (!pattern.endsWith('/*')) {
      dirs.push(path.join(repoRoot, pattern));
      continue;
    }
    const parent = path.join(repoRoot, pattern.slice(0, -2));
    for (const entry of readdirSync(parent, { withFileTypes: true }))
      if (entry.isDirectory()) dirs.push(path.join(parent, entry.name));
  }
  return dirs;
};

const dirsByName = new Map<string, string>();
for (const dir of workspaceDirs()) {
  const pkg = readPackageJson(dir);
  if (typeof pkg?.name === 'string') dirsByName.set(pkg.name, dir);
}

type Scan = {
  /** Newest counted file, or null when nothing was counted. */
  newest: { mtimeMs: number; file: string } | null;
  /** The root directory itself does not exist. */
  missing: boolean;
  /** Paths that could not be read or stat'd. */
  errors: string[];
};

/**
 * Newest file under `dir`, ignoring the directories and files `skipDir` /
 * `skipFile` reject.
 *
 * "Empty", "missing" and "unreadable" are kept distinct: collapsing them into
 * one null made a package with no readable sources report as fresh, which is
 * the one verdict a guard like this must never reach quietly.
 */
const scanTree = (
  dir: string,
  { skipDir, skipFile }: { skipDir: Skip; skipFile: Skip },
): Scan => {
  const result: Scan = { newest: null, missing: false, errors: [] };
  const walk = (current: string, isRoot: boolean) => {
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch (error) {
      if (isRoot && errorCode(error) === 'ENOENT') result.missing = true;
      else result.errors.push(current);
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!skipDir(entry.name)) walk(full, false);
        continue;
      }
      if (!entry.isFile() || skipFile(entry.name)) continue;
      let mtimeMs: number;
      try {
        ({ mtimeMs } = statSync(full));
      } catch (error) {
        // Vanished between readdir and stat (a build rewriting the tree under
        // us) is not a finding; anything else is.
        if (errorCode(error) !== 'ENOENT') result.errors.push(full);
        continue;
      }
      if (!result.newest || mtimeMs > result.newest.mtimeMs)
        result.newest = { mtimeMs, file: full };
    }
  };
  walk(dir, true);
  return result;
};

/**
 * Build inputs: the whole package directory minus {@link NOT_INPUT_DIRS}, not
 * just `src/`, because these packages have inputs outside it.
 * `design-system`'s build is `tsc -p … && node scripts/emit-theme-bootstrap.ts`
 * (which emits the `./theme-bootstrap.js` export target), and
 * `panda.shared.ts` at the package root is what `uikit-preview/panda.config.ts`
 * reads to generate the CSS every story consumes. Scanning `src/` alone left
 * both of those edits invisible, so the guard passed on a genuinely stale
 * artifact.
 */
const scanSources = (dir: string): Scan =>
  scanTree(dir, {
    skipDir: (name) => name.startsWith('.') || NOT_INPUT_DIRS.has(name),
    skipFile: (name) => NOT_INPUT_FILES.test(name),
  });

/** Compiled output: every file under `dist/` counts, tests included. */
const scanOutput = (dir: string): Scan =>
  scanTree(dir, { skipDir: skipNothing, skipFile: skipNothing });

const rel = (file: string) =>
  path.relative(repoRoot, file).split(path.sep).join('/');

// Walk this package's workspace dependencies transitively. devDependencies are
// excluded on purpose: tooling and the demo-relay harness are never bundled
// into a rendered story, so their build state cannot change a pixel.
const previewPkg = readPackageJson(packageDir);
if (typeof previewPkg?.name !== 'string')
  throw new Error(`No readable package.json in ${packageDir}`);

// The preview itself is rendered, not merely a dependency: `dist/` is what
// Ladle serves — its stories, its provider, its generated styled-system. Left
// out, a `Build packages` step narrowed to just the design-system would pass
// this guard while the bundle doing the rendering was absent or stale.
const rendered = new Set<string>([previewPkg.name]);
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

type Problem = { name: string; detail: string[] };
const problems: Problem[] = [];

for (const name of [...rendered].sort()) {
  const dir = dirsByName.get(name);
  if (!dir) continue;
  const pkg = readPackageJson(dir);
  // Only packages that compile to dist/ can be stale.
  if (!isRecord(pkg?.scripts) || typeof pkg.scripts.build !== 'string')
    continue;

  const source = scanSources(dir);
  const output = scanOutput(path.join(dir, 'dist'));

  if (source.errors.length > 0 || output.errors.length > 0) {
    problems.push({
      name,
      detail: [
        'could not read some paths, so freshness is unknown:',
        ...[...source.errors, ...output.errors].map((f) => `  ${rel(f)}`),
      ],
    });
    continue;
  }

  if (source.missing || !source.newest) {
    problems.push({
      name,
      detail: [
        `has a build script but no readable sources under ${rel(dir)}/`,
        '(this is a bug in the guard, not a stale build — do not ignore it)',
      ],
    });
    continue;
  }

  if (!output.newest) {
    problems.push({
      name,
      detail: [
        `newest source: ${rel(source.newest.file)}`,
        'compiled output: MISSING — this package has never been built',
      ],
    });
    continue;
  }

  if (source.newest.mtimeMs > output.newest.mtimeMs) {
    problems.push({
      name,
      detail: [
        `newest source: ${rel(source.newest.file)}`,
        `newest output: ${rel(output.newest.file)} (older)`,
      ],
    });
  }
}

if (problems.length > 0) {
  console.error(
    `${problems.length} package(s) the preview renders are not provably built from current sources:\n`,
  );
  for (const { name, detail } of problems) {
    console.error(`  ${name}`);
    for (const line of detail) console.error(`    ${line}`);
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
