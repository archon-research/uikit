import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { FileSystemOps } from '../fs-utils.js';
import type { Logger } from '../logger.js';
import {
  type BundleBudget,
  BundleBudgetCommand,
  type BundleSnapshot,
  eagerChunks,
  evaluateBundleBudget,
  readBundleSnapshot,
} from './bundle-budget.js';

/**
 * The fixtures are real `vite build` output, not hand-written trees. `split` is
 * a build whose `markdown` and `charts` groups are reached only through
 * `await import(...)`; `folded` is the same app with the markdown import made
 * top-level, and nothing else changed. The bundler emitted `folded` without a
 * warning or a non-zero exit — which is the whole reason this command exists.
 *
 * Keeping them as captured output rather than fixtures written to suit the
 * parser means the HTML shape, the hashed filenames, and the minified import
 * statements are the ones a consumer actually has.
 */
const FIXTURES = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../fixtures/bundle-budget',
);

const files = (snapshot: { chunks: readonly { file: string }[] }): string[] =>
  snapshot.chunks.map((chunk) => chunk.file).sort();

describe('readBundleSnapshot', () => {
  it('reads the entry and the modulepreload list out of a real index.html', () => {
    const snapshot = readBundleSnapshot(path.join(FIXTURES, 'split'));

    expect(snapshot.entries).toEqual(['assets/index-DZG7RHFl.js']);
    expect(snapshot.preloaded).toEqual(['assets/vendor-core-e7yQAHLJ.js']);
    expect(files(snapshot)).toHaveLength(5);
  });

  it('follows static imports and not dynamic ones', () => {
    const snapshot = readBundleSnapshot(path.join(FIXTURES, 'split'));
    const entry = snapshot.chunks.find(
      (chunk) => chunk.file === 'assets/index-DZG7RHFl.js',
    );

    // The entry statically imports vendor-core and dynamically imports the two
    // heavy groups. Only the static one may appear, or every lazy chunk in
    // every build would be counted as eager.
    expect(entry?.imports).toEqual(['assets/vendor-core-e7yQAHLJ.js']);
  });

  it('measures gzipped bytes', () => {
    const snapshot = readBundleSnapshot(path.join(FIXTURES, 'split'));
    for (const chunk of snapshot.chunks)
      expect(chunk.gzipBytes).toBeGreaterThan(0);
  });

  it('reads module ids from a sourcemap when one sits beside the chunk', () => {
    const mapped = readBundleSnapshot(
      path.join(FIXTURES, 'split-sourcemapped'),
    );
    const entry = mapped.chunks.find((chunk) =>
      chunk.file.startsWith('assets/index-'),
    );
    expect(entry?.sources).toEqual(['../../src/main.ts']);

    // …and reports their absence rather than inventing them.
    const unmapped = readBundleSnapshot(path.join(FIXTURES, 'split'));
    expect(unmapped.chunks.every((chunk) => chunk.sources === null)).toBe(true);
  });
});

describe('eagerChunks', () => {
  it('is the entry, its preloads, and their static-import closure', () => {
    const snapshot = readBundleSnapshot(path.join(FIXTURES, 'split'));

    // 5 chunks emitted, 2 of them eager: the lazy groups and the runtime chunk
    // only they import stay out.
    expect(files({ chunks: eagerChunks(snapshot) })).toEqual([
      'assets/index-DZG7RHFl.js',
      'assets/vendor-core-e7yQAHLJ.js',
    ]);
  });

  it('walks past a preload link into what it imports', () => {
    const snapshot: BundleSnapshot = {
      entries: ['entry.js'],
      preloaded: [],
      chunks: [
        {
          file: 'entry.js',
          gzipBytes: 10,
          imports: ['a.js'],
          sources: null,
          text: '',
        },
        {
          file: 'a.js',
          gzipBytes: 10,
          imports: ['b.js'],
          sources: null,
          text: '',
        },
        { file: 'b.js', gzipBytes: 10, imports: [], sources: null, text: '' },
        {
          file: 'lazy.js',
          gzipBytes: 10,
          imports: [],
          sources: null,
          text: '',
        },
      ],
    };

    // Transitive, so a build with `modulePreload: false` — no links at all — is
    // still measured over its whole critical path rather than the entry alone.
    expect(files({ chunks: eagerChunks(snapshot) })).toEqual([
      'a.js',
      'b.js',
      'entry.js',
    ]);
  });
});

const budget: BundleBudget = {
  eagerKb: 2,
  minChunks: 5,
  lazy: [{ name: 'markdown' }, { name: 'charts' }],
};

describe('evaluateBundleBudget', () => {
  it('passes the build whose groups are dynamically imported', () => {
    const report = evaluateBundleBudget(
      readBundleSnapshot(path.join(FIXTURES, 'split')),
      budget,
    );

    expect(report.ok).toBe(true);
    expect(report.checks.every((check) => check.ok)).toBe(true);
  });

  it('fails the build where a lazy group became eager', () => {
    // The regression in full: `markdown` is now preloaded. Note it is still
    // emitted as its own file, so a presence-only check would pass here.
    const snapshot = readBundleSnapshot(path.join(FIXTURES, 'folded'));
    expect(
      snapshot.chunks.some((chunk) =>
        chunk.file.startsWith('assets/markdown-'),
      ),
    ).toBe(true);

    const report = evaluateBundleBudget(snapshot, budget);

    expect(report.ok).toBe(false);
    const failure = report.checks.find((check) => !check.ok);
    expect(failure?.kind).toBe('lazy-chunk-eager');
    expect(failure?.message).toContain('markdown');
    expect(failure?.message).toContain('dynamically');
  });

  it('fails on the chunk count when a group leaves no file behind', () => {
    // The other shape of the same failure: `minChunks` is the only signal when
    // a group's `test` stops matching, since there is no chunk left to name.
    const report = evaluateBundleBudget(
      readBundleSnapshot(path.join(FIXTURES, 'folded')),
      { minChunks: 5 },
    );

    const failure = report.checks.find((check) => check.kind === 'chunk-count');
    expect(failure?.ok).toBe(false);
    expect(failure?.message).toContain('only 4 chunks');
  });

  it('names a lazy chunk the build never emitted', () => {
    const report = evaluateBundleBudget(
      readBundleSnapshot(path.join(FIXTURES, 'split')),
      { lazy: [{ name: 'editor' }] },
    );

    const failure = report.checks.find((check) => !check.ok);
    expect(failure?.kind).toBe('lazy-chunk-missing');
    expect(failure?.message).toContain('editor');
  });

  it('holds a correctly-lazy chunk to its own size budget', () => {
    const report = evaluateBundleBudget(
      readBundleSnapshot(path.join(FIXTURES, 'split')),
      { lazy: [{ name: 'markdown', maxKb: 0.05 }] },
    );

    const failure = report.checks.find((check) => !check.ok);
    expect(failure?.kind).toBe('lazy-chunk-size');
    expect(failure?.message).toContain('over its 0.05 kB budget');
  });

  it('reports the eager total with a largest-first breakdown when over', () => {
    const report = evaluateBundleBudget(
      readBundleSnapshot(path.join(FIXTURES, 'split')),
      { eagerKb: 0.5 },
    );

    const failure = report.checks.find((check) => check.kind === 'eager-size');
    expect(failure?.ok).toBe(false);
    // The chunk worth looking at has to come first, not the one that sorts first.
    expect(failure?.message).toMatch(/index-DZG7RHFl\.js[\s\S]*vendor-core/);
  });

  it('matches forbidEager against sourcemap module ids', () => {
    const mapped = path.join(FIXTURES, 'split-sourcemapped');

    // `main.ts` is in the eager entry's sources; `heavy-markdown.ts` is only in
    // the lazy chunk's, so a pattern for it must not fire.
    const hit = evaluateBundleBudget(readBundleSnapshot(mapped), {
      forbidEager: ['main\\.ts'],
    });
    expect(hit.checks.find((check) => check.kind === 'forbid-eager')?.ok).toBe(
      false,
    );

    const miss = evaluateBundleBudget(readBundleSnapshot(mapped), {
      forbidEager: ['heavy-markdown'],
    });
    expect(miss.ok).toBe(true);
  });

  it('warns that forbidEager is imprecise without sourcemaps', () => {
    const report = evaluateBundleBudget(
      readBundleSnapshot(path.join(FIXTURES, 'split')),
      { forbidEager: ['nothing-matches-this'] },
    );

    const warning = report.checks.find(
      (check) => check.kind === 'forbid-eager-imprecise',
    );
    expect(warning?.severity).toBe('warn');
    // A warning must not fail the command, only say the pass is weaker than it looks.
    expect(report.ok).toBe(true);
  });
});

type Recorded = { level: string; message: string };

function recordingLogger(into: Recorded[]): Logger {
  const push =
    (level: string) =>
    (message: string): void => {
      into.push({ level, message });
    };
  return {
    info: push('info'),
    warn: push('warn'),
    error: push('error'),
    debug: push('debug'),
  };
}

function fsWith(config: object | null): FileSystemOps {
  return {
    exists: () => config !== null,
    readFile: () => '',
    readJson: <T>() => config as T,
    realpath: (p: string) => p,
    isSymlink: () => false,
    removeDir: () => {},
    createSymlink: () => {},
    createDir: () => {},
    readDir: () => [],
    isDirectory: () => false,
  };
}

describe('BundleBudgetCommand', () => {
  it('exits clean on a build within budget', () => {
    const logs: Recorded[] = [];
    const command = new BundleBudgetCommand(
      fsWith({ dist: 'split', ...budget }),
      recordingLogger(logs),
    );

    expect(command.execute(['budget.json'], FIXTURES)).toBe(true);
    expect(logs.some((log) => log.level === 'error')).toBe(false);
  });

  it('fails, and says what to look at, on the folded build', () => {
    const logs: Recorded[] = [];
    const command = new BundleBudgetCommand(
      fsWith({ dist: 'folded', ...budget }),
      recordingLogger(logs),
    );

    expect(command.execute(['budget.json'], FIXTURES)).toBe(false);
    const errors = logs.filter((log) => log.level === 'error');
    expect(errors.some((log) => log.message.includes('markdown'))).toBe(true);
  });

  it('explains itself when there is no config to read', () => {
    const logs: Recorded[] = [];
    const command = new BundleBudgetCommand(
      fsWith(null),
      recordingLogger(logs),
    );

    expect(command.execute([], FIXTURES)).toBe(false);
    expect(logs[0]?.message).toContain('bundle-budget.json');
    // The error doubles as the template, since the thresholds are the consumer's.
    expect(logs[0]?.message).toContain('"eagerKb"');
  });

  it('says to run a build rather than reporting a passing budget over nothing', () => {
    const logs: Recorded[] = [];
    const command = new BundleBudgetCommand(
      fsWith({ dist: 'no-such-dist', ...budget }),
      recordingLogger(logs),
    );

    expect(command.execute(['budget.json'], FIXTURES)).toBe(false);
    expect(logs[0]?.message).toContain('Run your production build first');
  });
});
