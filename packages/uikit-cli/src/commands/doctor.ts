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

/**
 * ── Roleless `colorPalette` detection ──
 *
 * Panda compiles `colorPalette: 'violet'` into a ruleset that *remaps* the
 * generic palette custom properties onto that hue's tokens:
 *
 *   .alert--colorPalette_violet {
 *     --colors-color-palette-50: var(--colors-violet-50);   … 100…950
 *   }
 *
 * It emits one line per token that actually exists under the hue. So a hue with
 * only the 50–950 scale (any Panda default hue the preset never gave role
 * sub-tokens) maps the scale and nothing else, while a role-complete palette
 * (`neutral`/`gray`/`green`/`red`/`amber`/`blue` in this design system) also maps
 * `--colors-color-palette-solid-bg`, `-subtle-fg`, `-outline-border`, and the rest.
 *
 * Meanwhile a recipe that styles with a role emits the *reference* side:
 *
 *   .alert--emphasis_solid { background: var(--colors-color-palette-solid-bg); }
 *
 * Pair a roleless palette with a role reference and the custom property is
 * undefined in that scope: well-formed CSS, valid `var()` syntax, and the browser
 * silently drops the declaration. Nothing else in doctor catches it — the token
 * path resolved, and `staticCss` is wired.
 *
 * The stylesheet is therefore its own palette→roles map: the assignment rulesets
 * ARE the preset's role tokens in generated form, which is why this check reads
 * them out of the CSS rather than importing a table from the design system. A
 * palette added to the preset, or one a consumer defines in their own preset
 * extension, is covered the moment it appears in the CSS — with no list here to
 * keep in sync, and no dependency from this CLI on the design-system package.
 *
 * DETECTION BOUNDARY. Resolving which palette is in scope for a declaration is
 * the CSS cascade, and doctor does not simulate it. It resolves exactly one
 * scope — a **recipe**, keyed by the class-name stem Panda derives from
 * `className` — and reports a role reference only when a palette assigned
 * anywhere in that same recipe's classes fails to define the role. Slots count
 * as the same scope (`.chip__root--colorPalette_x` sets the properties; the
 * `.chip__dismiss` slot inherits them), and a reference is attributed to the
 * *rightmost* compound selector, the element the rule actually styles. Out of
 * scope, deliberately, and reported as clean:
 *
 * - Atomic utilities (`.color-palette_violet` + `.bg_colorPalette\.solid\.bg`).
 *   Two unrelated classes; whether they land on the same element, and whether an
 *   ancestor already supplied the role, is not knowable from the stylesheet.
 * - Cross-recipe cascade: a palette set on an outer recipe, a role consumed by an
 *   inner one.
 * - `var(--colors-color-palette-…, fallback)`. A fallback means the declaration
 *   survives, so it is not a silent drop — the regex below requires a bare
 *   reference and skips these by construction.
 *
 * Those are false negatives by design. The check must never fail a healthy
 * stylesheet, so every case where scope is ambiguous resolves to "no issue".
 */

/**
 * Leaf rulesets — `selector { declarations }` with no nested braces. Declarations
 * only ever live in leaves, so this is enough to read a stylesheet without a real
 * CSS parser, and it sees through `@layer`/`@media` wrappers for free.
 */
const LEAF_RULESET = /([^{}]+)\{([^{}]*)\}/g;

/**
 * A design-system recipe class: `.stem--variant_value`, `.stem__slot`, or
 * `.stem__slot--variant_value`. Requires the `__`/`--` shape so Panda's atomic
 * utilities (`.bg_surface`, `.c_text\.muted`) can never be mistaken for a recipe
 * scope named after their property.
 */
const RECIPE_CLASS =
  /\.([A-Za-z][A-Za-z0-9]*)(?:__[A-Za-z0-9-]+(?:--[A-Za-z0-9_-]+)?|--[A-Za-z0-9_-]+)/g;

/** A class with no variant/slot suffix — a recipe's base rule, e.g. `.button`. */
const BARE_CLASS = /\.([A-Za-z][A-Za-z0-9]*)(?![\w-])/g;

/** `--colors-color-palette-<role>: var(--colors-<palette>-<role>)`. */
const PALETTE_ROLE_ASSIGNMENT =
  /--colors-color-palette-([a-z0-9-]+)\s*:\s*var\(\s*--colors-([a-z0-9-]+)\s*\)/gi;

/** A bare `var(--colors-color-palette-<role>)` — no fallback (see boundary above). */
const PALETTE_ROLE_REFERENCE =
  /var\(\s*--colors-color-palette-([a-z0-9-]+)\s*\)/gi;

/**
 * `error` is a definite defect and fails the command (non-zero exit); `warn` is
 * a possible-but-unproven one, printed without affecting the exit code.
 */
export type DoctorSeverity = 'error' | 'warn';

export type DoctorIssue =
  | { kind: 'missing-static-css'; severity: DoctorSeverity }
  | {
      kind: 'unresolved-token';
      severity: DoctorSeverity;
      line: number;
      declaration: string;
    }
  | {
      kind: 'roleless-color-palette';
      severity: DoctorSeverity;
      line: number;
      /** Recipe class-name stem the reference and the palette share. */
      scope: string;
      /** Selector of the rule that references the role. */
      selector: string;
      /** Palette assigned in the same scope that lacks the role. */
      palette: string;
      /** Role sub-token suffix, e.g. `solid-bg`. */
      role: string;
    };

export type DoctorReport = {
  /** True when nothing of `error` severity was found — warnings do not fail. */
  ok: boolean;
  issues: DoctorIssue[];
};

type LeafRuleset = {
  selector: string;
  body: string;
  /** Absolute offset of the first declaration character, for line reporting. */
  bodyIndex: number;
};

/** What one recipe scope assigns and what it references. */
type PaletteScope = {
  /** Palette name -> role suffixes that palette maps in this scope. */
  palettes: Map<string, Set<string>>;
  /** Role suffix -> first site that references it. */
  references: Map<string, { selector: string; index: number }>;
};

function splitLeafRulesets(css: string): LeafRuleset[] {
  const leaves: LeafRuleset[] = [];
  for (const match of css.matchAll(LEAF_RULESET)) {
    // `match[1]` runs from just after the previous `}`, so it can carry leading
    // blank lines. Anchor on the `{` instead — a body offset added to the match
    // start would report a line too early by however many newlines precede the
    // selector.
    leaves.push({
      selector: match[1].trim(),
      body: match[2],
      bodyIndex: (match.index ?? 0) + match[0].indexOf('{') + 1,
    });
  }
  return leaves;
}

/** Every recipe stem the stylesheet mentions with a slot or variant suffix. */
function collectRecipeStems(leaves: LeafRuleset[]): Set<string> {
  const stems = new Set<string>();
  for (const leaf of leaves) {
    for (const match of leaf.selector.matchAll(RECIPE_CLASS)) {
      stems.add(match[1]);
    }
  }
  return stems;
}

/**
 * Split a selector list on top-level commas only. A comma inside a functional
 * pseudo-class (`:is(.a--x, .b--y)`, `:not(…)`, `:where(…)`) separates that
 * pseudo-class's arguments, not selectors — splitting there yields fragments
 * that are not selectors at all (`.badge--variant_solid:is(.a--x`), whose
 * rightmost recipe class is an argument rather than the styled element, so the
 * reference is attributed to a scope that does not exist. A backslash escapes
 * the next character, since Panda escapes parens inside class names
 * (`.w_calc\(100\%\)`).
 */
function splitSelectorList(selectorList: string): string[] {
  const selectors: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < selectorList.length; i++) {
    const char = selectorList[i];
    if (char === '\\') i++;
    else if (char === '(') depth++;
    else if (char === ')') depth = Math.max(0, depth - 1);
    else if (char === ',' && depth === 0) {
      selectors.push(selectorList.slice(start, i));
      start = i + 1;
    }
  }
  selectors.push(selectorList.slice(start));
  return selectors;
}

/**
 * Blank out functional-pseudo argument lists before the subject is read. Their
 * contents narrow *when* the rule matches; the class naming the element it
 * styles is always written outside the parens, so an argument must never win the
 * scope. They also carry commas and whitespace that would otherwise read as
 * selector-list and descendant separators.
 */
function stripPseudoArguments(selector: string): string {
  let stripped = selector;
  let previous: string;
  do {
    previous = stripped;
    stripped = stripped.replace(/(?<!\\)\([^()]*\)/g, '');
  } while (stripped !== previous);
  return stripped;
}

/**
 * The recipe stem of the element a selector actually styles: its rightmost
 * compound. `.dark .toggleSwitch__thumb` scopes to `toggleSwitch`, not to
 * whatever the ancestors are — attributing a reference to an ancestor's recipe
 * would invent a scope the declaration never had.
 */
function subjectRecipeStem(
  selector: string,
  stems: Set<string>,
): string | null {
  const compounds = stripPseudoArguments(selector)
    .split(/[\s>+~]+/)
    .filter(Boolean);
  for (let i = compounds.length - 1; i >= 0; i--) {
    const recipeClasses = [...compounds[i].matchAll(RECIPE_CLASS)];
    const last = recipeClasses.at(-1);
    if (last) return last[1];
    // A recipe's base rule (`.button { … }`) carries no suffix, so accept a bare
    // class only when the stylesheet proves elsewhere that it is a recipe.
    for (const match of [...compounds[i].matchAll(BARE_CLASS)].reverse()) {
      if (stems.has(match[1])) return match[1];
    }
  }
  return null;
}

/**
 * The palette a ruleset assigns, plus the roles it maps. Panda writes the palette
 * name into the *value* (`var(--colors-violet-solid-bg)`), which is read here
 * rather than parsed out of the selector so an atomic `.color-palette_violet` and
 * a recipe variant are handled by the same code.
 */
function readPaletteAssignment(
  body: string,
): { palette: string; roles: Set<string> } | null {
  let palette: string | null = null;
  const roles = new Set<string>();
  for (const match of body.matchAll(PALETTE_ROLE_ASSIGNMENT)) {
    const [, role, target] = match;
    if (!target.endsWith(`-${role}`)) continue;
    const name = target.slice(0, -(role.length + 1));
    palette ??= name;
    if (name === palette) roles.add(role);
  }
  return palette ? { palette, roles } : null;
}

function scopeFor(
  scopes: Map<string, PaletteScope>,
  stem: string,
): PaletteScope {
  let scope = scopes.get(stem);
  if (!scope) {
    scope = { palettes: new Map(), references: new Map() };
    scopes.set(stem, scope);
  }
  return scope;
}

function collectPaletteScopes(
  leaves: LeafRuleset[],
): Map<string, PaletteScope> {
  const stems = collectRecipeStems(leaves);
  const scopes = new Map<string, PaletteScope>();

  for (const leaf of leaves) {
    const assignment = readPaletteAssignment(leaf.body);
    const references = [...leaf.body.matchAll(PALETTE_ROLE_REFERENCE)];
    if (!assignment && references.length === 0) continue;

    for (const rawSelector of splitSelectorList(leaf.selector)) {
      const selector = rawSelector.trim();
      const stem = subjectRecipeStem(selector, stems);
      if (!stem) continue; // unknown scope — see DETECTION BOUNDARY
      const scope = scopeFor(scopes, stem);

      if (assignment) {
        const known = scope.palettes.get(assignment.palette) ?? new Set();
        for (const role of assignment.roles) known.add(role);
        scope.palettes.set(assignment.palette, known);
      }
      for (const match of references) {
        const role = match[1];
        if (scope.references.has(role)) continue;
        scope.references.set(role, {
          selector,
          index: leaf.bodyIndex + (match.index ?? 0),
        });
      }
    }
  }

  return scopes;
}

function lineOf(css: string, index: number): number {
  return css.slice(0, index).split('\n').length;
}

/**
 * Role references whose scope can assign a palette that does not define them.
 *
 * SEVERITY. A miss is an `error` only when it is definite — when *every* palette
 * the scope can be set to lacks the role, so no combination of that scope's
 * variants avoids the dropped declaration. The one-assignable-palette case is
 * that condition at its smallest: the palette is the only one there is.
 *
 * When some assignable palette does define the role, the pairing is merely
 * possible, and the stylesheet cannot say whether an app ever makes it: a recipe
 * exposing `colorPalette: violet` alongside a `solid` emphasis variant may never
 * combine the two. Reported as a `warn` — worth printing, since a real
 * combination is silently dropped CSS, but not worth failing a build over an
 * unproven one.
 */
function findRolelessPalettes(
  css: string,
  leaves: LeafRuleset[],
): DoctorIssue[] {
  const issues: DoctorIssue[] = [];
  for (const [scopeName, scope] of collectPaletteScopes(leaves)) {
    for (const [role, site] of scope.references) {
      const missing = [...scope.palettes]
        .filter(([, roles]) => !roles.has(role))
        .map(([palette]) => palette);
      const definite = missing.length === scope.palettes.size;
      for (const palette of missing) {
        issues.push({
          kind: 'roleless-color-palette',
          severity: definite ? 'error' : 'warn',
          line: lineOf(css, site.index),
          scope: scopeName,
          selector: site.selector,
          palette,
          role,
        });
      }
    }
  }
  return issues;
}

/**
 * Scan a generated Panda stylesheet for the silently-dropped-CSS failure class:
 * recipe variants that were never emitted (missing `staticCss`), semantic tokens
 * that resolved to a bare path (invalid declaration), and roleless `colorPalette`
 * values (valid `var()`, undefined in scope). Pure so it can be unit-tested
 * without a filesystem.
 */
export function scanGeneratedCss(css: string): DoctorReport {
  const issues: DoctorIssue[] = [];

  if (!hasAnyRecipeClass(css)) {
    issues.push({ kind: 'missing-static-css', severity: 'error' });
  }

  const seen = new Set<string>();
  for (const match of css.matchAll(UNRESOLVED_TOKEN_DECL)) {
    const index = match.index ?? 0;
    const line = css.slice(0, index).split('\n').length;
    const declaration = `${match[1]}: ${match[2]}`;
    const key = `${line}:${declaration}`;
    if (seen.has(key)) continue;
    seen.add(key);
    issues.push({
      kind: 'unresolved-token',
      severity: 'error',
      line,
      declaration,
    });
  }

  issues.push(...findRolelessPalettes(css, splitLeafRulesets(css)));

  return {
    ok: issues.every((issue) => issue.severity !== 'error'),
    issues,
  };
}

/** One member of the issue union, by `kind`. */
type IssueOf<K extends DoctorIssue['kind']> = Extract<DoctorIssue, { kind: K }>;

function missingStaticCssMessage(relative: string): string {
  return (
    `No design-system recipe classes found in ${relative}.\n` +
    "  The design system's recipes are applied by class name, so Panda's\n" +
    '  static extractor cannot see them — without `staticCss` they emit\n' +
    '  nothing, and runtime-selected variants (status tones, dense tables,\n' +
    '  drawer sizes) render unstyled. Spread the exported map into your\n' +
    '  Panda config `staticCss`:\n' +
    "    import { designSystemStaticCssRecipes } from '@archon-research/design-system/recipes';\n" +
    '    staticCss: { recipes: { ...designSystemStaticCssRecipes } }\n' +
    '  then re-run `panda codegen`. (A narrowed subset is fine — this only\n' +
    '  flags the case where nothing is wired at all.)'
  );
}

function unresolvedTokenMessage(
  issue: IssueOf<'unresolved-token'>,
  relative: string,
): string {
  return (
    `${relative}:${issue.line} unresolved token — \`${issue.declaration};\` ` +
    'is an invalid declaration the browser drops. The token path does not ' +
    'resolve to a `var(--…)`; check the token exists in the preset (or you ' +
    'passed a token path where a finished value was expected).'
  );
}

function rolelessColorPaletteMessage(
  issue: IssueOf<'roleless-color-palette'>,
  relative: string,
): string {
  return (
    `${relative}:${issue.line} roleless colorPalette — \`${issue.selector}\` ` +
    `reads \`var(--colors-color-palette-${issue.role})\`, but the ` +
    `\`${issue.scope}\` scope can be set to \`colorPalette: ${issue.palette}\`, ` +
    `which defines no \`${issue.role}\` role. The custom property is then ` +
    'undefined on that element: valid CSS the browser silently drops, so the ' +
    'declaration just does not apply. ' +
    (issue.severity === 'error'
      ? 'No palette this scope can take defines that role, so nothing avoids it. '
      : `Warning only: \`${issue.scope}\` can also take a role-complete palette, ` +
        'so this breaks only if the two are actually combined. ') +
    'Either style with a role-complete palette (one whose ruleset maps ' +
    `\`--colors-color-palette-${issue.role}\`), give \`${issue.palette}\` that ` +
    "role in your preset's colorPalette tokens, or reference a role the " +
    'palette does define.'
  );
}

/**
 * The console message for one finding. Exhaustive over `DoctorIssue` with no
 * default branch, so adding a `kind` without a message fails to compile.
 */
function doctorIssueMessage(issue: DoctorIssue, relative: string): string {
  switch (issue.kind) {
    case 'missing-static-css':
      return missingStaticCssMessage(relative);
    case 'unresolved-token':
      return unresolvedTokenMessage(issue, relative);
    case 'roleless-color-palette':
      return rolelessColorPaletteMessage(issue, relative);
  }
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
    const command = `npx panda cssgen --outfile "${outfile}"`;
    const result = this.executor.exec(command, { cwd, silent: true });
    if (!result.success || !this.fs.exists(outfile)) {
      this.logger.error(
        `Could not generate CSS with \`${command}\`.\n` +
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

    if (report.issues.length === 0) {
      this.logger.info(`✓ ${relative}: no silently-dropped CSS detected.`);
      return true;
    }

    for (const issue of report.issues) {
      const message = doctorIssueMessage(issue, relative);
      if (issue.severity === 'error') this.logger.error(message);
      else this.logger.warn(message);
    }

    if (report.ok) {
      this.logger.info(
        `✓ ${relative}: no silently-dropped CSS detected. ` +
          'The warnings above are unproven combinations, not failures.',
      );
    }
    return report.ok;
  }
}
