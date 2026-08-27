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
//      Anything outside a workspace -- root config, the lockfile, CI itself --
//      cannot be attributed to one package, so it falls back to the FULL set.
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

const repoRoot = process.cwd();
const INTERNAL_SCOPE = '@archon-research/';
const DEP_FIELDS = ['dependencies', 'peerDependencies', 'devDependencies'];

const git = (args) => {
  const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
};

const readJson = (relativePath) =>
  JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf8'));

// `packages` is what publish.yml receives: a space-separated list, or empty to
// mean "every non-private workspace package". `skip_publish` disambiguates the
// third case -- an affected set with nothing publishable in it, which must not
// be confused with the empty-means-everything default.
const emit = ({ packages, skipPublish }) => {
  if (!process.env.GITHUB_OUTPUT) return;
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `packages=${packages}\nskip_publish=${skipPublish}\n`,
  );
};

const publishEverything = (reason) => {
  console.log(`Publishing all workspace packages: ${reason}`);
  emit({ packages: '', skipPublish: false });
  process.exit(0);
};

const resolveBase = () => {
  const candidates = process.env.BASE_REF
    ? [process.env.BASE_REF]
    : ['origin/main', 'main'];
  for (const ref of candidates) {
    if (git(['rev-parse', '--verify', '--quiet', ref]) !== null) return ref;
  }
  return null;
};

// The root `workspaces` array is npm's own view of the monorepo, so reading it
// keeps this in step with `npm query ".workspace"` in publish.yml.
const readWorkspaces = () => {
  const workspaces = readJson('package.json').workspaces ?? [];
  const packages = new Map(); // package name -> { dir, private, internalDeps }
  const byDir = new Map(); // packages/<dir> -> package name

  for (const dir of workspaces) {
    const manifest = readJson(path.join(dir, 'package.json'));
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

const { packages, byDir } = readWorkspaces();

const base = resolveBase();
if (base === null) publishEverything('could not resolve a base ref to diff against');

// Three-dot: everything the branch added on top of the merge-base, ignoring
// whatever landed on the base ref since it forked.
const diff = git(['diff', '--name-only', `${base}...HEAD`]);
if (diff === null) publishEverything(`\`git diff ${base}...HEAD\` failed`);

const changedFiles = diff.split('\n').filter((line) => line.trim() !== '');
if (changedFiles.length === 0) publishEverything(`no changes against ${base}`);

const changed = new Set();
for (const file of changedFiles) {
  // Longest matching workspace dir wins, so a nested workspace would still be
  // attributed to itself rather than to its parent.
  const owner = [...byDir.keys()]
    .filter((dir) => file.startsWith(`${dir}/`))
    .sort((a, b) => b.length - a.length)[0];

  if (owner === undefined)
    publishEverything(`\`${file}\` is not owned by a workspace package`);

  changed.add(byDir.get(owner));
}

// Reverse the graph once, then walk downstream from the directly changed set.
const dependents = new Map([...packages.keys()].map((name) => [name, []]));
for (const [name, { internalDeps }] of packages) {
  for (const dep of internalDeps) dependents.get(dep)?.push(name);
}

const affected = new Set(changed);
const queue = [...changed];
while (queue.length > 0) {
  for (const dependent of dependents.get(queue.pop()) ?? []) {
    if (affected.has(dependent)) continue;
    affected.add(dependent);
    queue.push(dependent);
  }
}

const publishable = [...affected]
  .filter((name) => !packages.get(name).private)
  .sort();
const skipped = [...packages.keys()]
  .filter((name) => !affected.has(name) && !packages.get(name).private)
  .sort();

console.log(`Changed packages (vs ${base}): ${[...changed].sort().join(', ')}`);
console.log(`Publishing (${publishable.length}): ${publishable.join(', ') || '(none)'}`);
console.log(`Skipping unaffected (${skipped.length}): ${skipped.join(', ') || '(none)'}`);

if (publishable.length === 0)
  console.log('Nothing to publish: every affected package is private.');

emit({
  packages: publishable.join(' '),
  skipPublish: publishable.length === 0,
});
