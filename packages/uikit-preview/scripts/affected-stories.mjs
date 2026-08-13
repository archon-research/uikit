#!/usr/bin/env node
// Default `snapshot:update`: re-render only the visual snapshots a local change
// actually affects, instead of the whole suite. Use `snapshot:update:all` to
// force a full re-render.
//
// How it works:
//   1. Build the preview once. The `story-deps.json` Vite plugin (vite.config.ts)
//      emits a post-tree-shake map of every source module -> the story files
//      whose chunk graph includes it. Tree-shaking is what gives per-component
//      granularity through the shared design-system barrel.
//   2. Diff the working tree (+ branch vs base) and map each changed file to the
//      stories that depend on it.
//   3. Run `playwright test --update-snapshots` scoped to those stories via
//      SNAPSHOT_STORY_IDS (see tests/snapshot.spec.ts).
//
// Anything we cannot confidently attribute (shared config, panda/token sources,
// a changed file inside a consumed package we can't map to a used module) falls
// back to updating ALL snapshots — over-updating is cheap, missing one is not.
//
// Base ref for the branch diff is $SNAPSHOT_BASE (default: origin/main, else main).

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';

const packageDir = process.cwd();
const repoRoot = path.resolve(packageDir, '..', '..');
const PREVIEW_PKG_DIR = path
  .relative(repoRoot, packageDir)
  .split(path.sep)
  .join('/'); // packages/uikit-preview
const PREVIEW_PKG_NAME = PREVIEW_PKG_DIR.slice('packages/'.length); // uikit-preview
const PREVIEW_PREFIX = `${PREVIEW_PKG_DIR}/`;

const git = (args) => {
  const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
};

const resolveBase = () => {
  if (process.env.SNAPSHOT_BASE) return process.env.SNAPSHOT_BASE;
  for (const ref of ['origin/main', 'main']) {
    if (git(['rev-parse', '--verify', '--quiet', ref]) !== null) return ref;
  }
  return null;
};

const changedFiles = () => {
  const files = new Set();
  const add = (out) => {
    if (out)
      for (const line of out.split('\n'))
        if (line.trim()) files.add(line.trim());
  };
  const base = resolveBase();
  if (base) add(git(['diff', '--name-only', `${base}...HEAD`]));
  add(git(['diff', '--name-only', 'HEAD'])); // unstaged
  add(git(['diff', '--name-only', '--cached'])); // staged
  add(git(['ls-files', '--others', '--exclude-standard'])); // untracked
  return [...files];
};

const PORT = 61000;
const HOST = '127.0.0.1';

const runBuild = () => {
  console.log('› building preview to compute the affected-story graph…');
  const build = spawnSync('npm', ['run', 'build'], {
    cwd: packageDir,
    stdio: 'inherit',
  });
  if (build.status !== 0) process.exit(build.status ?? 1);
};

const waitForPort = (port, host, timeoutMs) =>
  new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const attempt = () => {
      const socket = net.connect(port, host);
      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() > deadline)
          reject(new Error(`preview server never came up on ${host}:${port}`));
        else setTimeout(attempt, 300);
      });
    };
    attempt();
  });

/**
 * Serve the already-built preview and run Playwright against it. Because
 * playwright.config's webServer uses `reuseExistingServer` off-CI, an
 * already-listening port means Playwright skips its own `npm run build &&
 * serve` — so the whole update does exactly one build (the one above).
 */
const runPlaywright = async (storyIds) => {
  const env = { ...process.env };
  if (storyIds) {
    env.SNAPSHOT_STORY_IDS = storyIds.join(',');
    console.log(
      `› updating ${storyIds.length} affected snapshot(s):\n  ${storyIds.join('\n  ')}`,
    );
  } else {
    delete env.SNAPSHOT_STORY_IDS;
    console.log(
      '› updating ALL snapshots (change is broad or could not be scoped).',
    );
  }

  const server = spawn('npm', ['run', 'snapshot:serve'], {
    cwd: packageDir,
    detached: true,
    stdio: 'ignore',
  });
  const killServer = () => {
    try {
      if (server.pid) process.kill(-server.pid, 'SIGTERM');
    } catch {
      // already gone
    }
  };
  process.on('exit', killServer);
  process.on('SIGINT', () => {
    killServer();
    process.exit(130);
  });

  try {
    await waitForPort(PORT, HOST, 180_000);
    const result = spawnSync(
      'npx',
      ['playwright', 'test', '--update-snapshots'],
      {
        cwd: packageDir,
        stdio: 'inherit',
        env,
      },
    );
    process.exitCode = result.status ?? 1;
  } finally {
    killServer();
  }
};

// --- main -----------------------------------------------------------------

const changed = changedFiles();
if (changed.length === 0) {
  console.log('No changed files detected — nothing to update.');
  process.exit(0);
}

runBuild();

const depsPath = path.join(packageDir, 'dist', 'story-deps.json');
const metaPath = path.join(packageDir, 'dist', 'meta.json');
if (!existsSync(depsPath) || !existsSync(metaPath)) {
  console.error(
    'Missing dist/story-deps.json or dist/meta.json after build; updating all.',
  );
  await runPlaywright(null);
  process.exit(process.exitCode ?? 0);
}

/** @type {{ modules: Record<string, string[]> }} */
const deps = JSON.parse(readFileSync(depsPath, 'utf8'));
/** @type {{ stories: Record<string, { filePath: string }> }} */
const meta = JSON.parse(readFileSync(metaPath, 'utf8'));

// story file (repo-rel) -> story ids
const idsByStoryFile = new Map();
for (const [id, story] of Object.entries(meta.stories)) {
  const file = `${PREVIEW_PREFIX}${story.filePath}`;
  if (!idsByStoryFile.has(file)) idsByStoryFile.set(file, []);
  idsByStoryFile.get(file).push(id);
}

// Packages that appear in the dependency graph at all — a change to any other
// package cannot affect a snapshot.
const graphPackages = new Set();
for (const moduleId of Object.keys(deps.modules)) {
  const m = moduleId.match(/^packages\/([^/]+)\//);
  if (m) graphPackages.add(m[1]);
}

const CODE_EXT = /\.(tsx?|jsx?|mts|cts|mjs|cjs)$/;
const affected = new Set();
let fullRun = false;
const unmatched = [];

for (const file of changed) {
  if (fullRun) break;

  // A changed story file → exactly its stories.
  if (idsByStoryFile.has(file)) {
    for (const id of idsByStoryFile.get(file)) affected.add(id);
    continue;
  }

  const pkg = file.match(/^packages\/([^/]+)\/(.*)$/);
  if (!pkg) {
    // Repo-root files (.github, docs, tooling) don't affect rendered stories.
    continue;
  }
  const [, pkgName, rest] = pkg;

  if (pkgName === PREVIEW_PKG_NAME) {
    // uikit-preview: a non-story source/config change is broad (shared provider,
    // panda config, vite/playwright config, the spec itself, styled-system…).
    if (rest.startsWith('src/stories/')) continue; // deleted/renamed story, no id
    fullRun = true;
    continue;
  }

  if (!graphPackages.has(pkgName)) continue; // package no story depends on

  // Panda preset inputs (recipes + the preset itself) compile into the
  // globally-generated styled-system CSS, which every story consumes by stable
  // class name — not through the JS module graph. So a change here can restyle
  // any story (e.g. a DataTable recipe tweak repaints the table embedded in the
  // filter-primitives story) while mapping to zero modules in story-deps, which
  // the per-module lookup below would silently skip. Attribute conservatively.
  if (/^src\/(recipes\/|panda-preset\.)/.test(rest)) {
    fullRun = true;
    continue;
  }

  // Consumed package: map a source file to its built module and look it up.
  const srcMatch = rest.match(/^src\/(.+)$/);
  if (srcMatch && CODE_EXT.test(rest)) {
    const distRel = srcMatch[1].replace(CODE_EXT, '.js');
    const distId = `packages/${pkgName}/dist/${distRel}`;
    const stories = deps.modules[distId];
    if (stories) {
      for (const s of stories)
        for (const id of idsByStoryFile.get(s) ?? []) affected.add(id);
    } else {
      unmatched.push(file); // built module exists but no story uses it → skip
    }
    continue;
  }

  // Non-code source, package.json, panda-preset, tsconfig… inside a consumed
  // package: could change many built outputs. Be safe.
  fullRun = true;
}

if (unmatched.length > 0 && !fullRun) {
  console.log(
    `› ${unmatched.length} changed file(s) map to no rendered story (skipped):`,
  );
  for (const f of unmatched) console.log(`  ${f}`);
}

if (fullRun) {
  await runPlaywright(null);
} else if (affected.size === 0) {
  console.log('No changed files affect any snapshot — nothing to update.');
  process.exit(0);
} else {
  await runPlaywright([...affected].sort());
}
