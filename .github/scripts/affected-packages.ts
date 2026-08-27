#!/usr/bin/env node
// Resolve the workspace packages a branch's changes affect, so that a
// prerelease publish stops republishing byte-identical copies of everything
// else. `bump.yml` runs this and threads the result into `publish.yml`'s
// `packages` input; `main` releases never call it and always publish the full
// set.
//
// How it works:
//   1. Diff the branch against its merge-base with the base ref (origin/main).
//   2. Map each changed file to the workspace that owns it (packages/<dir>/...).
//      A repo-root path that provably cannot change any package's published
//      artifact -- the root README, CI config -- attributes to no package.
//      Anything else outside a workspace falls back to the FULL set.
//   3. Expand downstream over the workspace dependency graph: a package is
//      affected if its own directory changed, or if a workspace package it
//      depends on changed (transitively).
//
// The graph reads dependencies, peerDependencies *and* devDependencies. Runtime
// edges alone are too narrow: every package compiles against its siblings with
// plain `tsc`, and the shared tsconfig/oxlint-config/oxfmt-config packages are
// devDependencies, so a change in one of those can alter a dependent's emitted
// output. This is why each package has to declare the internal packages it
// actually uses -- an undeclared edge is an invisible edge.
//
// Emitting nothing means "publish everything", so every bail-out below is a
// safe fallback: over-publishing is cheap, missing a package is not.
//
// Base ref for the branch diff is $BASE_REF (default: origin/main, else main).

import { spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

type Manifest = {
  name: string;
  private?: boolean;
  workspaces?: string[];
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  overrides?: Record<string, unknown>;
  engines?: Record<string, string>;
  packageManager?: string;
};

type WorkspacePackage = {
  dir: string;
  private: boolean;
  internalDeps: string[];
};

const repoRoot = process.cwd();
const INTERNAL_SCOPE = '@archon-research/';

// Repo-root paths that cannot change what any package publishes, so a change
// confined to them attributes to no package instead of forcing a full publish.
// This is an explicit allowlist, not a heuristic: anything not named here still
// falls back to the full set. Note what is deliberately absent -- `.node-version`
// and `.npmrc` both change how packages are built or installed, so they keep
// forcing a full publish.
//
// Each package carries its own README; the root one documents the repo, not any
// published artifact. `.github/**` and `.releaserc.json` decide how a release
// runs, not what ends up inside a tarball.
const NON_AFFECTING_FILES = new Set([
  'README.md',
  'LICENSE',
  'DEVELOPMENT.md',
  '.gitattributes',
  '.gitignore',
  '.fallowrc.json',
  '.releaserc.json',
  'lefthook.yml',
  'renovate.json5',
]);
const NON_AFFECTING_DIRS = ['.github/', 'docs/'];

// The root manifest is mostly inert for publishing -- but its `overrides` and
// its devDependencies (typescript lives there) reach into every package's build
// output, so it is only ignorable when none of those fields moved.
const BUILD_AFFECTING_ROOT_FIELDS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'overrides',
  'engines',
  'packageManager',
  'workspaces',
] as const;
const DEP_FIELDS = [
  'dependencies',
  'peerDependencies',
  'devDependencies',
] as const;

const git = (args: string[]): string | null => {
  const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
};

// These manifests are this repo's own, written by the same people who edit this
// script, so the shape is asserted rather than validated -- a malformed one is a
// broken checkout, not an input to defend against.
const readManifest = (relativePath: string): Manifest =>
  JSON.parse(
    readFileSync(path.join(repoRoot, relativePath), 'utf8'),
  ) as Manifest;

// `packages` is what publish.yml receives: a space-separated list, or empty to
// mean "every non-private workspace package". `skip_publish` disambiguates the
// third case -- an affected set with nothing publishable in it, which must not
// be confused with the empty-means-everything default.
const emit = (result: { packages: string; skipPublish: boolean }): void => {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) return;
  appendFileSync(
    outputFile,
    `packages=${result.packages}\nskip_publish=${result.skipPublish}\n`,
  );
};

// A function declaration, not the arrow used elsewhere here: TypeScript only
// applies never-returning control-flow narrowing to declarations and to consts
// with an explicit type annotation, and the callers below rely on that to know
// `base`, `diff` and `owner` are non-null once this has not fired.
function publishEverything(reason: string): never {
  console.log(`Publishing all workspace packages: ${reason}`);
  emit({ packages: '', skipPublish: false });
  process.exit(0);
}

const resolveBase = (): string | null => {
  const override = process.env.BASE_REF;
  const candidates = override ? [override] : ['origin/main', 'main'];
  for (const ref of candidates) {
    if (git(['rev-parse', '--verify', '--quiet', ref]) !== null) return ref;
  }
  return null;
};

// The root `workspaces` array is npm's own view of the monorepo, so reading it
// keeps this in step with `npm query ".workspace"` in publish.yml.
const readWorkspaces = (): {
  packages: Map<string, WorkspacePackage>;
  byDir: Map<string, string>;
} => {
  const workspaces = readManifest('package.json').workspaces ?? [];
  const packages = new Map<string, WorkspacePackage>();
  const byDir = new Map<string, string>(); // packages/<dir> -> package name

  for (const dir of workspaces) {
    const manifest = readManifest(path.join(dir, 'package.json'));
    const internalDeps = DEP_FIELDS.flatMap((field) =>
      Object.keys(manifest[field] ?? {}),
    ).filter((dep) => dep.startsWith(INTERNAL_SCOPE) && dep !== manifest.name);

    packages.set(manifest.name, {
      dir,
      private: manifest.private === true,
      internalDeps: [...new Set(internalDeps)],
    });
    byDir.set(dir, manifest.name);
  }

  return { packages, byDir };
};

// Which build-affecting fields of the root package.json moved between the base
// and HEAD. An unreadable or unparseable side returns null, meaning "cannot
// tell" -- the caller treats that as a reason to publish everything.
const changedRootManifestFields = (baseRef: string): string[] | null => {
  const parse = (revision: string): Manifest | null => {
    const raw = git(['show', `${revision}:package.json`]);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as Manifest;
    } catch {
      return null;
    }
  };

  const before = parse(baseRef);
  const after = parse('HEAD');
  if (before === null || after === null) return null;

  return BUILD_AFFECTING_ROOT_FIELDS.filter(
    (field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]),
  );
};

const { packages, byDir } = readWorkspaces();

const isPrivate = (name: string): boolean =>
  packages.get(name)?.private === true;

const base = resolveBase();
if (base === null) {
  publishEverything('could not resolve a base ref to diff against');
}

// Three-dot: everything the branch added on top of the merge-base, ignoring
// whatever landed on the base ref since it forked.
const diff = git(['diff', '--name-only', `${base}...HEAD`]);
if (diff === null) publishEverything(`\`git diff ${base}...HEAD\` failed`);

const changedFiles = diff.split('\n').filter((line) => line.trim() !== '');
if (changedFiles.length === 0) publishEverything(`no changes against ${base}`);

// Longest matching workspace dir wins, so a nested workspace would still be
// attributed to itself rather than to its parent.
const ownersByDepth = [...byDir.entries()].sort(
  ([left], [right]) => right.length - left.length,
);

const changed = new Set<string>();
for (const file of changedFiles) {
  const owner = ownersByDepth.find(([dir]) => file.startsWith(`${dir}/`));
  if (owner !== undefined) {
    changed.add(owner[1]);
    continue;
  }

  if (NON_AFFECTING_FILES.has(file)) continue;
  if (NON_AFFECTING_DIRS.some((dir) => file.startsWith(dir))) continue;

  if (file === 'package.json') {
    const fields = changedRootManifestFields(base);
    if (fields === null) {
      publishEverything('could not compare the root package.json against the base');
    }
    if (fields.length === 0) continue;
    publishEverything(
      `root package.json changed build-affecting fields: ${fields.join(', ')}`,
    );
  }

  publishEverything(`\`${file}\` is not owned by a workspace package`);
}

// Reverse the graph once, then walk downstream from the directly changed set.
const dependents = new Map<string, string[]>();
for (const name of packages.keys()) dependents.set(name, []);
for (const [name, { internalDeps }] of packages) {
  for (const dep of internalDeps) dependents.get(dep)?.push(name);
}

const affected = new Set<string>(changed);
const queue = [...changed];
for (let index = 0; index < queue.length; index += 1) {
  for (const dependent of dependents.get(queue[index]) ?? []) {
    if (affected.has(dependent)) continue;
    affected.add(dependent);
    queue.push(dependent);
  }
}

const publishable = [...affected].filter((name) => !isPrivate(name)).sort();
const skipped = [...packages.keys()]
  .filter((name) => !affected.has(name) && !isPrivate(name))
  .sort();

console.log(
  `Changed packages (vs ${base}): ${[...changed].sort().join(', ') || '(none)'}`,
);
console.log(
  `Publishing (${publishable.length}): ${publishable.join(', ') || '(none)'}`,
);
console.log(
  `Skipping unaffected (${skipped.length}): ${skipped.join(', ') || '(none)'}`,
);

if (publishable.length === 0)
  console.log(
    changed.size === 0
      ? 'Nothing to publish: no change touched a workspace package.'
      : 'Nothing to publish: every affected package is private.',
  );

emit({
  packages: publishable.join(' '),
  skipPublish: publishable.length === 0,
});
