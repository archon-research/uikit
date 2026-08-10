import { existsSync } from 'node:fs';
import path from 'node:path';

import type { Plugin, Rollup } from 'vite';

// Ladle auto-loads this file via Vite's loadConfigFromFile and merges its
// plugins with Ladle's own (React + tsconfig-paths). We only add an analysis
// plugin here — no resolve/build overrides — so the preview builds exactly as
// before, plus a `story-deps.json` artifact used by `snapshot:update:affected`.

/** Walk up from `start` to the git root so emitted ids are repo-relative. */
const findRepoRoot = (start: string): string => {
  let dir = start;
  while (dir !== path.dirname(dir)) {
    if (existsSync(path.join(dir, '.git'))) return dir;
    dir = path.dirname(dir);
  }
  return start;
};

const toRepoRel = (repoRoot: string, id: string): string | null => {
  // Virtual modules (`\0...`, `vite/preload-helper`, etc.) have no file on disk.
  if (id.startsWith('\0') || !path.isAbsolute(id)) return null;
  const rel = path.relative(repoRoot, id).split(path.sep).join('/');
  // Outside the repo (absolute deps) or in node_modules — never a git-tracked
  // change, so they can't scope a local update. Drop to keep the map small.
  if (rel.startsWith('..') || rel.includes('node_modules/')) return null;
  return rel;
};

const STORY_ID = /\/src\/stories\/.*\.stories\.[jt]sx?$/;

/**
 * Emits `story-deps.json`: a reverse map of every repo-tracked source module to
 * the story files whose (post-tree-shake) chunk graph includes it.
 *
 * Ran in `generateBundle` on purpose: Rollup has finished tree-shaking, so a
 * story's chunk pulls in only the components it actually renders — the shared
 * barrel (`@archon-research/design-system`) does NOT drag every component into
 * every story. That is what makes the map granular enough to update one
 * component's snapshots without re-rendering all 188 stories.
 */
const emitStoryDeps = (): Plugin => {
  const repoRoot = findRepoRoot(process.cwd());
  return {
    name: 'uikit-preview:story-deps',
    apply: 'build',
    generateBundle(_options, bundle) {
      const chunksByFile = new Map<string, Rollup.OutputChunk>();
      for (const output of Object.values(bundle)) {
        if (output.type === 'chunk') chunksByFile.set(output.fileName, output);
      }

      // module (repo-rel) -> set of story files (repo-rel) that depend on it.
      const reverse = new Map<string, Set<string>>();

      for (const chunk of chunksByFile.values()) {
        if (!chunk.facadeModuleId || !STORY_ID.test(chunk.facadeModuleId))
          continue;
        const storyFile = toRepoRel(repoRoot, chunk.facadeModuleId);
        if (!storyFile) continue;

        // Collect every module reachable from this story's chunk by walking the
        // chunk import graph (chunk.imports are sibling chunk file names).
        const seenChunks = new Set<string>();
        const queue = [chunk.fileName];
        while (queue.length > 0) {
          const fileName = queue.pop() as string;
          if (seenChunks.has(fileName)) continue;
          seenChunks.add(fileName);
          const current = chunksByFile.get(fileName);
          if (!current) continue;
          for (const moduleId of current.moduleIds) {
            const rel = toRepoRel(repoRoot, moduleId);
            if (!rel) continue;
            let stories = reverse.get(rel);
            if (!stories) reverse.set(rel, (stories = new Set()));
            stories.add(storyFile);
          }
          queue.push(...current.imports);
        }
      }

      const modules: Record<string, string[]> = {};
      for (const [moduleId, stories] of [...reverse].sort(([a], [b]) =>
        a.localeCompare(b),
      )) {
        modules[moduleId] = [...stories].sort();
      }

      this.emitFile({
        type: 'asset',
        fileName: 'story-deps.json',
        source: `${JSON.stringify({ version: 1, modules }, null, 2)}\n`,
      });
    },
  };
};

export default {
  plugins: [emitStoryDeps()],
};
