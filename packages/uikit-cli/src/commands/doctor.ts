import os from 'node:os';
import path from 'node:path';

import type { CommandExecutor } from '../command-executor.js';
import type { FileSystemOps } from '../fs-utils.js';
import type { Logger } from '../logger.js';

/**
 * Design-system recipe class-name stems. A design-system recipe emits classes
 * of the form `${className}--variant_x` (recipe) or `${className}__slot` (slot
 * recipe) — and *only* when the `designSystemStaticCssRecipes` spread is wired
 * into the consumer's Panda `staticCss`, because components apply these as
 * runtime strings that Panda's extractor cannot see. So the presence of any one
 * of these stems is the signal that `staticCss` is wired.
 *
 * The gate is deliberately "**at least one** present", not "all": a consumer
 * only ships CSS for the recipes it actually uses, and a legitimately narrowed
 * `staticCss` map is valid (and encouraged, for bundle size). We flag only the
 * total-omission case — the headline failure where nothing runtime-selected
 * emits at all. This list therefore does not need to be exhaustive or perfectly
 * in sync with the library; it just needs a few stems any real consumer emits.
 */
export const DESIGN_SYSTEM_RECIPE_CLASSNAMES = [
  'badge',
  'button',
  'drawer',
  'dataTable',
  'panel',
  'statTile',
  'toggleSwitch',
  'segmentedControl',
  'surfaceMessage',
  'sidebarLayout',
] as const;

/** True if any design-system recipe class is present (i.e. staticCss is wired). */
function hasAnyRecipeClass(css: string): boolean {
  return DESIGN_SYSTEM_RECIPE_CLASSNAMES.some(
    (name) => css.includes(`.${name}--`) || css.includes(`.${name}__`),
  );
}

/**
 * Color-ish CSS properties whose value, if written as a bare `token.path`,
 * means an unresolved semantic token: Panda emits the path verbatim (e.g.
 * `color: text.subtle;`) which the browser silently drops. `var(...)`, hex,
 * numeric and keyword values never contain a dotted lowercase identifier, so a
 * dotted value on one of these properties is the tell.
 */
const UNRESOLVED_TOKEN_DECL =
  /(color|background|background-color|border-color|fill|stroke|outline-color)\s*:\s*([a-z][\w-]*(?:\.[a-z0-9][\w-]*)+)\s*[;}]/gi;

export type DoctorIssue =
  | { kind: 'missing-static-css' }
  | { kind: 'unresolved-token'; line: number; declaration: string };

export type DoctorReport = {
  ok: boolean;
  issues: DoctorIssue[];
};

/**
 * Scan a generated Panda stylesheet for the silently-dropped-CSS failure class:
 * recipe variants that were never emitted (missing `staticCss`), and semantic
 * tokens that resolved to a bare path (invalid declaration). Pure so it can be
 * unit-tested without a filesystem.
 */
export function scanGeneratedCss(css: string): DoctorReport {
  const issues: DoctorIssue[] = [];

  if (!hasAnyRecipeClass(css)) {
    issues.push({ kind: 'missing-static-css' });
  }

  const seen = new Set<string>();
  for (const match of css.matchAll(UNRESOLVED_TOKEN_DECL)) {
    const index = match.index ?? 0;
    const line = css.slice(0, index).split('\n').length;
    const declaration = `${match[1]}: ${match[2]}`;
    const key = `${line}:${declaration}`;
    if (seen.has(key)) continue;
    seen.add(key);
    issues.push({ kind: 'unresolved-token', line, declaration });
  }

  return { ok: issues.length === 0, issues };
}

/**
 * Locations a Panda project commonly writes `styles.css`, relative to the
 * consumer root. First existing wins; an explicit path always takes precedence.
 */
const CSS_CANDIDATES = [
  'styled-system/styles.css',
  'src/styled-system/styles.css',
  'app/styled-system/styles.css',
];

/**
 * `uikit-cli doctor [path-to-styles.css] [--codegen]` — fails loudly on the
 * silent CSS failures the library's authoring model otherwise hides.
 *
 * Point it at a generated stylesheet, or pass `--codegen` and it runs
 * `panda cssgen --outfile` itself into a temp file — the mode PostCSS-plugin
 * consumers need, since they never write a frozen `styled-system/styles.css`.
 */
export class DoctorCommand {
  private fs: FileSystemOps;
  private logger: Logger;
  private executor: CommandExecutor;

  constructor(fs: FileSystemOps, logger: Logger, executor: CommandExecutor) {
    this.fs = fs;
    this.logger = logger;
    this.executor = executor;
  }

  /**
   * Generate a full stylesheet from the consumer's Panda config into a temp
   * file (for PostCSS-plugin consumers with no frozen styles.css). Returns the
   * temp path, or null if codegen failed.
   */
  private runCodegen(cwd: string): string | null {
    const outfile = path.join(os.tmpdir(), `uikit-doctor-${process.pid}.css`);
    const result = this.executor.exec(
      `npx panda cssgen --outfile "${outfile}"`,
      { cwd, silent: true },
    );
    if (!result.success || !this.fs.exists(outfile)) {
      this.logger.error(
        'Could not generate CSS with `panda cssgen --codegen`.\n' +
          '  Ensure @pandacss/dev is installed and a panda config is present in\n' +
          `  ${cwd}. Underlying error:\n` +
          `  ${(result.stderr || 'panda produced no output file').trim()}`,
      );
      return null;
    }
    return outfile;
  }

  private resolveCssPath(args: string[], cwd: string): string | null {
    const explicit = args.find((arg) => !arg.startsWith('-'));
    if (explicit) {
      const resolved = path.resolve(cwd, explicit);
      return this.fs.exists(resolved) ? resolved : null;
    }
    for (const candidate of CSS_CANDIDATES) {
      const resolved = path.resolve(cwd, candidate);
      if (this.fs.exists(resolved)) return resolved;
    }
    return null;
  }

  /** Returns true when the stylesheet is healthy. */
  execute(args: string[], cwd: string = process.cwd()): boolean {
    const useCodegen = args.includes('--codegen');
    let cssPath: string | null;
    let temp = false;

    if (useCodegen) {
      cssPath = this.runCodegen(cwd);
      if (!cssPath) return false; // runCodegen already logged
      temp = true;
    } else {
      cssPath = this.resolveCssPath(args, cwd);
      if (!cssPath) {
        this.logger.error(
          'Could not find a generated Panda stylesheet.\n' +
            `Looked for: ${CSS_CANDIDATES.join(', ')} (relative to ${cwd}).\n` +
            'Options:\n' +
            '  - run your `panda codegen` first, then re-run doctor;\n' +
            '  - pass the path explicitly: uikit-cli doctor path/to/styles.css;\n' +
            '  - if you use the Panda PostCSS plugin (no frozen styles.css),\n' +
            '    pass --codegen and doctor will run `panda cssgen` itself.',
        );
        return false;
      }
    }

    const css = this.fs.readFile(cssPath);
    if (temp) this.fs.removeDir(cssPath, { force: true });
    const report = scanGeneratedCss(css);
    const relative = temp
      ? '(panda cssgen)'
      : path.relative(cwd, cssPath) || cssPath;

    if (report.ok) {
      this.logger.info(`✓ ${relative}: no silently-dropped CSS detected.`);
      return true;
    }

    for (const issue of report.issues) {
      if (issue.kind === 'missing-static-css') {
        this.logger.error(
          `No design-system recipe classes found in ${relative}.\n` +
            "  The design system's recipes are applied by class name, so Panda's\n" +
            '  static extractor cannot see them — without `staticCss` they emit\n' +
            '  nothing, and runtime-selected variants (status tones, dense tables,\n' +
            '  drawer sizes) render unstyled. Spread the exported map into your\n' +
            '  Panda config `staticCss`:\n' +
            "    import { designSystemStaticCssRecipes } from '@archon-research/design-system/recipes';\n" +
            '    staticCss: { recipes: { ...designSystemStaticCssRecipes } }\n' +
            '  then re-run `panda codegen`. (A narrowed subset is fine — this only\n' +
            '  flags the case where nothing is wired at all.)',
        );
      } else {
        this.logger.error(
          `${relative}:${issue.line} unresolved token — \`${issue.declaration};\` ` +
            'is an invalid declaration the browser drops. The token path does not ' +
            'resolve to a `var(--…)`; check the token exists in the preset (or you ' +
            'passed a token path where a finished value was expected).',
        );
      }
    }
    return false;
  }
}
