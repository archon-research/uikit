import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

import type { FileSystemOps } from '../fs-utils.js';
import type { Logger } from '../logger.js';

/**
 * ── What a bundle budget has to measure, and why the obvious version does not ──
 *
 * A budget written against the entry chunk alone passes while the critical path
 * regresses. The entry is not what the browser loads before first paint: the
 * build also emits `<link rel="modulepreload">` for the entry's static
 * dependencies, and *that* set is what a chunk-group config actually moves
 * around. Move a dependency out of the entry into its own group and the entry
 * shrinks by exactly as much as the preload list grows, so an entry-only number
 * improves while nothing about the page did.
 *
 * So the eager set here is the entry scripts named by `index.html`, the
 * modulepreload links beside them, and the static-import closure over both.
 * The closure matters because `build.modulePreload: false` emits no links at
 * all: without it the check would silently measure one chunk and call it the
 * critical path.
 *
 * ── The regression with no error message ──
 *
 * A chunk group only stays out of the eager set for as long as something
 * *dynamically* imports it. Turn one `await import('./heavy')` into a top-level
 * import — a refactor, an auto-import, a barrel file that re-exports it — and
 * the bundler rewires the group without complaint. Measured against a real
 * `vite build`, that regression looks like this:
 *
 *   before: index.html preloads [vendor-core]        5 chunks
 *   after:  index.html preloads [vendor-core, markdown]  4 chunks
 *
 * Note what does *not* happen: `markdown-<hash>.js` still exists, still has its
 * own file, and the build still exits 0. A check that asserts named lazy chunks
 * *exist* passes here. The assertion that catches it is that a lazy chunk must
 * not be in the eager set — which is why {@link BundleBudget.lazy} checks
 * membership, not just presence.
 *
 * `minChunks` is the backstop for the other shape of the same failure: a group
 * whose `test` no longer matches anything (a renamed module, a dependency that
 * restructured its subpaths) is folded into the entry and leaves no file behind
 * to name. There is no error for that either — only a chunk count that quietly
 * went down.
 */

/** Kilobytes as the bundler's own build report prints them: 1 kB = 1000 bytes. */
const BYTES_PER_KB = 1000;

/**
 * `error` fails the command (non-zero exit); `warn` is printed and does not.
 * Matches `doctor`'s severity split.
 */
export type BudgetSeverity = 'error' | 'warn';

/** One chunk as read off disk. */
export type BundleChunk = {
  /** Path relative to the dist root, POSIX-separated: `assets/index-abc.js`. */
  file: string;
  gzipBytes: number;
  /**
   * Static import targets as dist-relative paths. Dynamic imports are
   * deliberately excluded — they are the thing being kept out of the eager set.
   */
  imports: readonly string[];
  /**
   * Module ids from the chunk's sourcemap, or `null` when no `.map` sits beside
   * it. See {@link BundleBudget.forbidEager} for what that costs.
   */
  sources: readonly string[] | null;
  /** The chunk's own text, the fallback haystack when `sources` is `null`. */
  text: string;
};

export type BundleSnapshot = {
  /** Entry scripts named by `<script type="module" src>`, dist-relative. */
  entries: readonly string[];
  /** `<link rel="modulepreload" href>` targets, dist-relative. */
  preloaded: readonly string[];
  chunks: readonly BundleChunk[];
};

export type LazyChunkBudget = {
  /** Chunk-group name: matches `<name>-<hash>.js` or exactly `<name>.js`. */
  name: string;
  /** Gzipped ceiling for the chunk, in kB. Omit to check placement only. */
  maxKb?: number;
};

export type BundleBudget = {
  /** Build output directory, relative to the cwd. Defaults to `dist`. */
  dist?: string;
  /** Entry HTML inside `dist`. Defaults to `index.html`. */
  html?: string;
  /** Ceiling for the summed gzipped size of every eager chunk, in kB. */
  eagerKb?: number;
  /**
   * Least number of JavaScript chunks the build must emit. The backstop for a
   * chunk group that folded back into the entry without leaving a file to name.
   */
  minChunks?: number;
  /** Chunks that must exist, stay under a size, and stay out of the eager set. */
  lazy?: readonly LazyChunkBudget[];
  /**
   * Regular-expression sources that must not match anything in the eager set —
   * the packages whose weight the split exists to defer.
   *
   * Matched against each eager chunk's sourcemap `sources` (real module ids, so
   * `@visx` matches `../../node_modules/@visx/xychart/esm/index.js`). With no
   * sourcemap beside the chunk there are no module ids to match, and this falls
   * back to the chunk's filename and its minified text — which finds a package
   * that leaves a string literal behind and misses one that does not. That
   * fallback reports a warning saying so; `build.sourcemap: 'hidden'` makes the
   * check exact without shipping maps to users.
   */
  forbidEager?: readonly string[];
};

export type BudgetCheck = {
  /** Stable identifier for the assertion, e.g. `lazy-chunk-eager`. */
  kind: string;
  ok: boolean;
  severity: BudgetSeverity;
  /** One line when it passed; the full explanation when it did not. */
  message: string;
};

export type BundleBudgetReport = {
  /** True when nothing of `error` severity failed. */
  ok: boolean;
  checks: readonly BudgetCheck[];
};

function kb(bytes: number): string {
  return `${(bytes / BYTES_PER_KB).toFixed(1)} kB`;
}

/** `assets/markdown-B_P7JvW4.js` matches the group name `markdown`. */
function matchesChunkName(file: string, name: string): boolean {
  const base = path.posix.basename(file);
  return (
    base === `${name}.js` ||
    new RegExp(
      `^${name.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')}-[^/]*\\.js$`,
    ).test(base)
  );
}

/**
 * Every chunk the browser loads before the page is interactive: the entries,
 * their modulepreload links, and everything reachable from those by static
 * import.
 */
export function eagerChunks(snapshot: BundleSnapshot): readonly BundleChunk[] {
  const byFile = new Map(snapshot.chunks.map((chunk) => [chunk.file, chunk]));
  const seen = new Set<string>();
  const queue = [...snapshot.entries, ...snapshot.preloaded];

  while (queue.length > 0) {
    const file = queue.shift();
    if (file === undefined || seen.has(file)) continue;
    seen.add(file);
    // A preload target that is not a chunk we read (a CSS file, a stale link)
    // contributes nothing to walk; it is simply not in the map.
    for (const next of byFile.get(file)?.imports ?? []) queue.push(next);
  }

  return snapshot.chunks.filter((chunk) => seen.has(chunk.file));
}

/** Text a `forbidEager` pattern is matched against, most precise first. */
function haystack(chunk: BundleChunk): string {
  return chunk.sources === null
    ? `${chunk.file}\n${chunk.text}`
    : `${chunk.file}\n${chunk.sources.join('\n')}`;
}

function checkEagerSize(
  eager: readonly BundleChunk[],
  eagerKb: number,
): BudgetCheck {
  const total = eager.reduce((sum, chunk) => sum + chunk.gzipBytes, 0);
  const limit = eagerKb * BYTES_PER_KB;
  if (total <= limit) {
    return {
      kind: 'eager-size',
      ok: true,
      severity: 'error',
      message: `eager critical path ${kb(total)} gzipped, within ${eagerKb} kB (${eager.length} chunks)`,
    };
  }

  // Largest first: the list is the answer to "what do I look at", so it has to
  // lead with the chunk that would move the number.
  const breakdown = [...eager]
    .sort((a, b) => b.gzipBytes - a.gzipBytes)
    .map((chunk) => `      ${kb(chunk.gzipBytes).padStart(9)}  ${chunk.file}`)
    .join('\n');

  return {
    kind: 'eager-size',
    ok: false,
    severity: 'error',
    message:
      `eager critical path is ${kb(total)} gzipped, over the ${eagerKb} kB budget by ` +
      `${kb(total - limit)}.\n` +
      '  This is the entry plus its modulepreload links plus their static imports —\n' +
      '  everything the browser fetches before the page is interactive, largest first:\n' +
      `${breakdown}\n` +
      '  Either defer one of these behind a dynamic import so it leaves the eager set,\n' +
      '  or raise `eagerKb` deliberately and say why.',
  };
}

function checkLazyChunk(
  budget: LazyChunkBudget,
  snapshot: BundleSnapshot,
  eagerFiles: ReadonlySet<string>,
): BudgetCheck[] {
  const matches = snapshot.chunks.filter((chunk) =>
    matchesChunkName(chunk.file, budget.name),
  );

  if (matches.length === 0) {
    return [
      {
        kind: 'lazy-chunk-missing',
        ok: false,
        severity: 'error',
        message:
          `no chunk named \`${budget.name}\` was emitted.\n` +
          '  A chunk group whose `test` matches nothing is folded into the entry and\n' +
          '  the build still exits 0 — there is no warning for this. Check that the\n' +
          "  group's pattern still matches the module paths it was written for (a\n" +
          '  renamed module, or a dependency that restructured its subpaths, breaks it\n' +
          '  silently), and that something still imports the code at all.',
      },
    ];
  }

  const checks: BudgetCheck[] = [];
  for (const chunk of matches) {
    if (eagerFiles.has(chunk.file)) {
      checks.push({
        kind: 'lazy-chunk-eager',
        ok: false,
        severity: 'error',
        message:
          `\`${budget.name}\` (${chunk.file}) is in the eager set — it is preloaded or\n` +
          '  statically imported, so the browser fetches it before first paint and the\n' +
          '  split buys nothing.\n' +
          '  The chunk still exists and the build still exits 0, which is why this is\n' +
          '  worth asserting: a group stays lazy only while something *dynamically*\n' +
          '  imports it. Look for a top-level `import` of this code that used to be an\n' +
          '  `await import(...)` — a barrel file that re-exports it counts, and so does\n' +
          '  a type-only import written without `import type`.',
      });
      continue;
    }

    if (
      budget.maxKb !== undefined &&
      chunk.gzipBytes > budget.maxKb * BYTES_PER_KB
    ) {
      checks.push({
        kind: 'lazy-chunk-size',
        ok: false,
        severity: 'error',
        message:
          `\`${budget.name}\` (${chunk.file}) is ${kb(chunk.gzipBytes)} gzipped, over its ` +
          `${budget.maxKb} kB budget.\n` +
          '  It is correctly lazy, so this does not hit first paint — but it is what the\n' +
          '  user waits for when the feature is opened.',
      });
      continue;
    }

    checks.push({
      kind: 'lazy-chunk',
      ok: true,
      severity: 'error',
      message: `\`${budget.name}\` is lazy at ${kb(chunk.gzipBytes)} gzipped (${chunk.file})`,
    });
  }

  return checks;
}

function checkForbiddenEager(
  patterns: readonly string[],
  eager: readonly BundleChunk[],
): BudgetCheck[] {
  const checks: BudgetCheck[] = [];
  const unmapped = eager.filter((chunk) => chunk.sources === null);

  if (unmapped.length > 0) {
    checks.push({
      kind: 'forbid-eager-imprecise',
      ok: false,
      severity: 'warn',
      message:
        `${unmapped.length} eager chunk(s) have no sourcemap beside them, so there are no\n` +
        '  module ids to match `forbidEager` against and the patterns fall back to the\n' +
        '  chunk filename and its minified text. That finds a package which leaves a\n' +
        '  string literal behind and misses one that does not, so a pass here is weaker\n' +
        '  than it looks. `build.sourcemap: "hidden"` makes it exact without shipping\n' +
        '  maps to users.',
    });
  }

  for (const source of patterns) {
    const pattern = new RegExp(source);
    const hits = eager.filter((chunk) => pattern.test(haystack(chunk)));

    checks.push(
      hits.length === 0
        ? {
            kind: 'forbid-eager',
            ok: true,
            severity: 'error',
            message: `/${source}/ is absent from the eager set`,
          }
        : {
            kind: 'forbid-eager',
            ok: false,
            severity: 'error',
            message:
              `/${source}/ matched ${hits.length} eager chunk(s): ` +
              `${hits.map((chunk) => chunk.file).join(', ')}.\n` +
              '  These packages are meant to be deferred, so something now reaches them on\n' +
              '  the critical path. Find the static import that pulled them in; if the\n' +
              '  import is only for a type, `import type` removes it from the graph.',
          },
    );
  }

  return checks;
}

function checkMinChunks(
  snapshot: BundleSnapshot,
  minChunks: number,
): BudgetCheck {
  const count = snapshot.chunks.length;
  return count >= minChunks
    ? {
        kind: 'chunk-count',
        ok: true,
        severity: 'error',
        message: `${count} chunks emitted, at least ${minChunks} required`,
      }
    : {
        kind: 'chunk-count',
        ok: false,
        severity: 'error',
        message:
          `only ${count} chunks were emitted, fewer than the ${minChunks} required.\n` +
          '  A chunk group that nothing dynamically imports is folded back into the\n' +
          '  entry, and the build reports nothing at all — a dropped chunk count is the\n' +
          '  only signal. Compare the emitted filenames against the group names in the\n' +
          '  build config and find the one that no longer appears.',
      };
}

/**
 * Evaluate a snapshot against a budget. Pure, so the assertions can be tested
 * without a build — see `readBundleSnapshot` for the half that touches disk.
 */
export function evaluateBundleBudget(
  snapshot: BundleSnapshot,
  budget: BundleBudget,
): BundleBudgetReport {
  const eager = eagerChunks(snapshot);
  const eagerFiles = new Set(eager.map((chunk) => chunk.file));
  const checks: BudgetCheck[] = [];

  if (budget.eagerKb !== undefined) {
    checks.push(checkEagerSize(eager, budget.eagerKb));
  }
  for (const lazy of budget.lazy ?? []) {
    checks.push(...checkLazyChunk(lazy, snapshot, eagerFiles));
  }
  if (budget.forbidEager && budget.forbidEager.length > 0) {
    checks.push(...checkForbiddenEager(budget.forbidEager, eager));
  }
  if (budget.minChunks !== undefined) {
    checks.push(checkMinChunks(snapshot, budget.minChunks));
  }

  return {
    ok: checks.every((check) => check.ok || check.severity !== 'error'),
    checks,
  };
}

/** Every `.js` file under `dir`, as dist-relative POSIX paths. */
function listJsFiles(dir: string, base: string = dir): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...listJsFiles(full, base));
    else if (entry.endsWith('.js'))
      files.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return files;
}

/**
 * Static import specifiers in a chunk: `import … from "x"`, `export … from "x"`,
 * and the bare `import "x"`.
 *
 * `import(` is excluded by construction — a dynamic import is exactly what keeps
 * a chunk out of the eager set, so following one would make every lazy chunk
 * look eager. The `from` form covers re-exports, which are static imports too.
 */
const STATIC_IMPORT = /(?:\bfrom\s*|\bimport\s*)(["'])([^"']+)\1/g;

function staticImports(text: string, file: string): string[] {
  const dir = path.posix.dirname(file);
  const imports: string[] = [];
  for (const match of text.matchAll(STATIC_IMPORT)) {
    const specifier = match[2];
    if (specifier === undefined || !specifier.startsWith('.')) continue;
    imports.push(path.posix.normalize(path.posix.join(dir, specifier)));
  }
  return imports;
}

/** `<script type="module" src>` and `<link rel="modulepreload" href>` targets. */
function readHtmlReferences(html: string): {
  entries: string[];
  preloaded: string[];
} {
  const entries: string[] = [];
  const preloaded: string[] = [];

  for (const match of html.matchAll(/<script\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/type\s*=\s*["']module["']/i.test(tag)) continue;
    const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (src !== undefined) entries.push(src);
  }

  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/rel\s*=\s*["']modulepreload["']/i.test(tag)) continue;
    const href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (href !== undefined) preloaded.push(href);
  }

  return { entries, preloaded };
}

/**
 * Resolve an `index.html` reference to the file it names inside `dist`.
 *
 * The href carries the app's **public base path** — `/assets/index-abc.js` at
 * the root, `/app/assets/index-abc.js` under a subpath deployment — and that
 * prefix is not part of the path on disk. Rather than take the base as config
 * and get it wrong, the reference is matched against the files actually emitted:
 * exactly one of them ends with the href's tail. A reference that matches
 * nothing (a CSS link, an absolute URL to a CDN) resolves to `null` and is
 * dropped.
 */
function resolveReference(
  reference: string,
  files: readonly string[],
): string | null {
  const withoutQuery = (reference.split(/[?#]/)[0] ?? reference).replace(
    /^\//,
    '',
  );
  return (
    files.find(
      (file) => file === withoutQuery || withoutQuery.endsWith(`/${file}`),
    ) ?? null
  );
}

/** Read a built `dist` directory into the shape `evaluateBundleBudget` takes. */
export function readBundleSnapshot(
  distDir: string,
  htmlFile: string = 'index.html',
): BundleSnapshot {
  const html = readFileSync(path.join(distDir, htmlFile), 'utf8');
  const references = readHtmlReferences(html);

  const chunks: BundleChunk[] = listJsFiles(distDir).map((file) => {
    const full = path.join(distDir, file);
    const text = readFileSync(full, 'utf8');
    let sources: readonly string[] | null = null;
    try {
      const map = JSON.parse(readFileSync(`${full}.map`, 'utf8')) as {
        sources?: string[];
      };
      sources = map.sources ?? [];
    } catch {
      // No `.map` beside the chunk, or one that is not readable JSON. Either
      // way there are no module ids; `forbidEager` says what that costs.
      sources = null;
    }

    return {
      file,
      gzipBytes: gzipSync(Buffer.from(text)).length,
      imports: staticImports(text, file),
      sources,
      text,
    };
  });

  const files = chunks.map((chunk) => chunk.file);
  const resolveAll = (refs: readonly string[]): string[] =>
    refs
      .map((ref) => resolveReference(ref, files))
      .filter((file): file is string => file !== null);

  return {
    entries: resolveAll(references.entries),
    preloaded: resolveAll(references.preloaded),
    chunks,
  };
}

const EXAMPLE_CONFIG = `{
  "dist": "dist",
  "eagerKb": 320,
  "minChunks": 6,
  "lazy": [
    { "name": "markdown", "maxKb": 200 },
    { "name": "charts", "maxKb": 240 }
  ],
  "forbidEager": ["micromark|@visx|react-markdown"]
}`;

/** Locations a budget config is looked for, relative to the cwd. */
const CONFIG_CANDIDATES = ['bundle-budget.json', '.bundle-budget.json'];

/**
 * `uikit-cli bundle-budget [config.json] [--dist <dir>]` — asserts a built
 * `dist` still has the shape its chunk-group config was written to produce.
 *
 * Runs in the consumer's cwd against their own build output, like `doctor`, and
 * exits non-zero on a definite failure so it gates CI.
 */
export class BundleBudgetCommand {
  private fs: FileSystemOps;
  private logger: Logger;

  constructor(fs: FileSystemOps, logger: Logger) {
    this.fs = fs;
    this.logger = logger;
  }

  private resolveConfigPath(args: string[], cwd: string): string | null {
    const explicit = args.find((arg) => !arg.startsWith('-'));
    if (explicit) {
      const resolved = path.resolve(cwd, explicit);
      return this.fs.exists(resolved) ? resolved : null;
    }
    for (const candidate of CONFIG_CANDIDATES) {
      const resolved = path.resolve(cwd, candidate);
      if (this.fs.exists(resolved)) return resolved;
    }
    return null;
  }

  /** Returns true when the build is within budget. */
  execute(args: string[], cwd: string = process.cwd()): boolean {
    const configPath = this.resolveConfigPath(args, cwd);
    if (!configPath) {
      this.logger.error(
        'Could not find a bundle budget config.\n' +
          `Looked for: ${CONFIG_CANDIDATES.join(', ')} (relative to ${cwd}).\n` +
          'Pass one explicitly (uikit-cli bundle-budget path/to/budget.json), or\n' +
          'create one — the thresholds are yours, the checks are not:\n' +
          `${EXAMPLE_CONFIG}`,
      );
      return false;
    }

    let budget: BundleBudget;
    try {
      budget = this.fs.readJson<BundleBudget>(configPath);
    } catch (error) {
      this.logger.error(
        `Could not read ${path.relative(cwd, configPath)}: ` +
          `${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }

    const distFlag = args.indexOf('--dist');
    const dist = path.resolve(
      cwd,
      (distFlag === -1 ? undefined : args[distFlag + 1]) ??
        budget.dist ??
        'dist',
    );
    const relativeDist = path.relative(cwd, dist) || dist;

    let snapshot: BundleSnapshot;
    try {
      snapshot = readBundleSnapshot(dist, budget.html ?? 'index.html');
    } catch (error) {
      this.logger.error(
        `Could not read the build output in ${relativeDist}.\n` +
          '  Run your production build first — this checks emitted chunks, so there is\n' +
          '  nothing to measure until one exists. Underlying error:\n' +
          `  ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }

    if (snapshot.entries.length === 0) {
      this.logger.error(
        `No \`<script type="module">\` entry found in ${relativeDist}/${budget.html ?? 'index.html'}.\n` +
          '  Without an entry there is no critical path to measure. If this app is not\n' +
          '  built from an HTML entry, point `html` at the document that is.',
      );
      return false;
    }

    const report = evaluateBundleBudget(snapshot, budget);

    for (const check of report.checks) {
      if (check.ok) this.logger.info(`  ✓ ${check.message}`);
      else if (check.severity === 'warn') this.logger.warn(check.message);
      else this.logger.error(check.message);
    }

    if (report.ok) {
      this.logger.info(`✓ ${relativeDist}: within budget.`);
    }
    return report.ok;
  }
}
