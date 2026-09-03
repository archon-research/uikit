#!/usr/bin/env node
// Default `snapshot:update`: re-render only the visual snapshots a local change
// actually affects, instead of the whole suite. Use `snapshot:update:all` to
// force a full re-render.
//
// How it works:
//   1. Build every workspace package once, preview last. Stories bundle each
//      dependency's `dist/`, never its `src/`, so the dependency builds are what
//      make the render reflect the edit under test rather than the previous one
//      (see `runBuild`; `check-stale-deps.ts` enforces it). The
//      `story-deps.json` Vite plugin (vite.config.ts) then emits a
//      post-tree-shake map of every source module -> the story files whose
//      chunk graph includes it. Tree-shaking is what gives per-component
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

/** `dist/story-deps.json`: built module (repo-rel) -> story files using it. */
type StoryDeps = {
  modules: Record<string, string[]>;
};

/** The slice of Ladle's `dist/meta.json` this script reads. */
type PreviewMeta = {
  stories: Record<string, { filePath: string }>;
};

const packageDir = process.cwd();
const repoRoot = path.resolve(packageDir, '..', '..');
const PREVIEW_PKG_DIR = path
  .relative(repoRoot, packageDir)
  .split(path.sep)
  .join('/'); // packages/uikit-preview
const PREVIEW_PKG_NAME = PREVIEW_PKG_DIR.slice('packages/'.length); // uikit-preview
const PREVIEW_PREFIX = `${PREVIEW_PKG_DIR}/`;

const git = (args: string[]): string | null => {
  const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
};

const resolveBase = (): string | null => {
  if (process.env.SNAPSHOT_BASE) return process.env.SNAPSHOT_BASE;
  for (const ref of ['origin/main', 'main']) {
    if (git(['rev-parse', '--verify', '--quiet', ref]) !== null) return ref;
  }
  return null;
};

const changedFiles = (): string[] => {
  const files = new Set<string>();
  const add = (out: string | null) => {
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

/**
 * Build every workspace package, not just this one.
 *
 * The preview imports `@archon-research/*` through each package's `exports`,
 * which resolve to `dist/` — Ladle bundles that compiled output and never sees
 * the package's `src/`. Building only this package therefore re-rendered the
 * PREVIOUS build of every dependency, which matched the PREVIOUS baseline: the
 * run passed and rewrote nothing while the change was real.
 *
 * Root `npm run build` is `--workspaces --if-present` in the dependency order
 * the root `workspaces` array encodes — the same command CI's visual-snapshots
 * job runs before it renders. It includes this package's own build, so the
 * whole update still does exactly one build of each package; warm, the extra
 * dependency compilation costs a few seconds.
 */
const runBuild = () => {
  console.log('› building all workspace packages (dependencies + preview)…');
  const build = spawnSync('npm', ['run', 'build'], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  if (build.status !== 0) process.exit(build.status ?? 1);
};

/**
 * Prove the build above actually refreshed every package the stories render,
 * so this script cannot silently regress to validating a stale bundle.
 */
const checkDepsAreFresh = () => {
  const check = spawnSync('node', ['scripts/check-stale-deps.ts'], {
    cwd: packageDir,
    stdio: 'inherit',
  });
  if (check.status !== 0) process.exit(check.status ?? 1);
};

/** Is something already listening? A free port is required, never reused. */
const portInUse = (port: number, host: string) =>
  new Promise<boolean>((resolve) => {
    const socket = net.connect(port, host);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
  });

const waitForPort = (port: number, host: string, timeoutMs: number) =>
  new Promise<void>((resolve, reject) => {
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
 * playwright.config's webServer uses `reuseExistingServer` off-CI, the server
 * started here means Playwright skips its own build-and-serve — so the whole
 * update does exactly one build of each package (the one above).
 */
const runPlaywright = async (storyIds: string[] | null) => {
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

  // Nothing else may hold the port. `ladle preview` would fail to bind, and
  // because playwright.config's `reuseExistingServer` is on off-CI, Playwright
  // would then scrape whatever *is* listening — a leftover server, or another
  // worktree's `snapshot:serve` — comparing this branch's baselines against a
  // different checkout's pixels. Fail rather than render the wrong tree.
  if (await portInUse(PORT, HOST)) {
    console.error(
      `Something is already listening on ${HOST}:${PORT}, which is where the\n` +
        'preview under test has to be served from. Stop it and re-run:\n\n' +
        `  lsof -nP -iTCP:${PORT} -sTCP:LISTEN\n`,
    );
    process.exitCode = 1;
    return;
  }

  const server = spawn('npm', ['run', 'snapshot:serve'], {
    cwd: packageDir,
    detached: true,
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let serverError = '';
  server.stderr?.on('data', (chunk: Buffer) => {
    serverError += chunk.toString();
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
    // A server that dies (bad build, bind failure) would otherwise leave
    // waitForPort spinning for its full timeout; surface its stderr instead.
    await Promise.race([
      waitForPort(PORT, HOST, 180_000),
      new Promise<never>((_, reject) => {
        server.once('exit', (code) => {
          reject(
            new Error(
              `preview server exited (code ${code}) before serving ${HOST}:${PORT}\n${serverError}`,
            ),
          );
        });
      }),
    ]);
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
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    killServer();
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isStoryDeps = (value: unknown): value is StoryDeps =>
  isRecord(value) &&
  isRecord(value.modules) &&
  Object.values(value.modules).every(
    (stories) =>
      Array.isArray(stories) &&
      stories.every((story) => typeof story === 'string'),
  );

const isPreviewMeta = (value: unknown): value is PreviewMeta =>
  isRecord(value) &&
  isRecord(value.stories) &&
  Object.values(value.stories).every(
    (story) => isRecord(story) && typeof story.filePath === 'string',
  );

/** Parse a build artifact, failing loudly if it is not the shape we expect. */
const readArtifact = <T>(
  file: string,
  isValid: (value: unknown) => value is T,
): T => {
  const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (!isValid(parsed)) throw new Error(`Unexpected shape in ${file}`);
  return parsed;
};

// --- main -----------------------------------------------------------------

const changed = changedFiles();
if (changed.length === 0) {
  console.log('No changed files detected — nothing to update.');
  process.exit(0);
}

runBuild();
checkDepsAreFresh();

const depsPath = path.join(packageDir, 'dist', 'story-deps.json');
const metaPath = path.join(packageDir, 'dist', 'meta.json');
if (!existsSync(depsPath) || !existsSync(metaPath)) {
  console.error(
    'Missing dist/story-deps.json or dist/meta.json after build; updating all.',
  );
  await runPlaywright(null);
  process.exit(process.exitCode ?? 0);
}

const deps = readArtifact(depsPath, isStoryDeps);
const meta = readArtifact(metaPath, isPreviewMeta);

// story file (repo-rel) -> story ids
const idsByStoryFile = new Map<string, string[]>();
for (const [id, story] of Object.entries(meta.stories)) {
  const file = `${PREVIEW_PREFIX}${story.filePath}`;
  const ids = idsByStoryFile.get(file) ?? [];
  ids.push(id);
  idsByStoryFile.set(file, ids);
}

// Packages that appear in the dependency graph at all — a change to any other
// package cannot affect a snapshot.
const graphPackages = new Set<string>();
for (const moduleId of Object.keys(deps.modules)) {
  const m = moduleId.match(/^packages\/([^/]+)\//);
  if (m?.[1]) graphPackages.add(m[1]);
}

const CODE_EXT = /\.(tsx?|jsx?|mts|cts|mjs|cjs)$/;
const affected = new Set<string>();
let fullRun = false;
const unmatched: string[] = [];

for (const file of changed) {
  if (fullRun) break;

  // A changed story file → exactly its stories.
  if (idsByStoryFile.has(file)) {
    for (const id of idsByStoryFile.get(file) ?? []) affected.add(id);
    continue;
  }

  const pkg = file.match(/^packages\/([^/]+)\/(.*)$/);
  if (!pkg) {
    // Repo-root files (.github, docs, tooling) don't affect rendered stories.
    continue;
  }
  const [, pkgName, rest] = pkg;
  // Both groups are non-optional in the pattern above, so a match carries them.
  if (pkgName === undefined || rest === undefined) continue;

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
  if (srcMatch?.[1] && CODE_EXT.test(rest)) {
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
