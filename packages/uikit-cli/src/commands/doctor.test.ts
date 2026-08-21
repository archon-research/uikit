import { describe, expect, it } from 'vitest';

import type { CommandExecutor } from '../command-executor.js';
import type { FileSystemOps } from '../fs-utils.js';
import type { Logger } from '../logger.js';
import { DoctorCommand, scanGeneratedCss } from './doctor.js';

/** A stylesheet with recipe classes present and only resolved declarations. */
const healthyCss = `
.badge--variant_outline { color: var(--colors-text-default); }
.drawer__content--size_lg { width: min(40rem, 100vw); }
.c_text\\.muted { color: var(--colors-text-muted); }
.bg_surface { background: var(--colors-surface-default); }
.stroke_series { stroke: var(--colors-chart-series-primary); }
`;

describe('scanGeneratedCss', () => {
  it('passes a healthy stylesheet', () => {
    const report = scanGeneratedCss(healthyCss);
    expect(report.ok).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it('flags a stylesheet with no design-system recipe classes (staticCss unwired)', () => {
    const css = `
.c_text\\.muted { color: var(--colors-text-muted); }
.bg_surface { background: var(--colors-surface-default); }
`;
    const report = scanGeneratedCss(css);
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.kind === 'missing-static-css')).toBe(
      true,
    );
  });

  it('passes a narrowed stylesheet that emits only one recipe (not all)', () => {
    // Only Badge is wired — a valid narrowed staticCss map. The gate must not
    // demand Drawer/DataTable/etc. that this consumer never uses.
    const css =
      '.badge--variant_outline { color: var(--colors-text-default); }';
    const report = scanGeneratedCss(css);
    expect(report.ok).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it('flags an unresolved token-path declaration with its line', () => {
    const css = `${healthyCss}\n.c_text\\.subtle { color: text.subtle; }`;
    const report = scanGeneratedCss(css);
    expect(report.ok).toBe(false);
    const issue = report.issues.find((i) => i.kind === 'unresolved-token');
    expect(issue).toMatchObject({ declaration: 'color: text.subtle' });
  });

  it('does not flag resolved var() declarations or class selectors', () => {
    // `.c_text\.subtle` as a *selector* must not be mistaken for a declaration.
    const css = `${healthyCss}\n.c_text\\.subtle { color: var(--colors-text-muted); }`;
    const report = scanGeneratedCss(css);
    expect(report.issues.some((i) => i.kind === 'unresolved-token')).toBe(
      false,
    );
  });

  it('catches an unresolved background token too', () => {
    const css = `${healthyCss}\n.bg_x { background: bg.success; }`;
    const report = scanGeneratedCss(css);
    expect(
      report.issues.some(
        (i) =>
          i.kind === 'unresolved-token' &&
          i.declaration === 'background: bg.success',
      ),
    ).toBe(true);
  });
});

/**
 * The role sub-tokens a role-complete palette maps, abbreviated. Panda emits one
 * `--colors-color-palette-<role>: var(--colors-<hue>-<role>)` line per token that
 * exists under the hue, so the presence or absence of these lines is what makes a
 * palette role-carrying or roleless.
 */
const ROLES = ['solid-bg', 'solid-fg', 'subtle-bg', 'subtle-fg'];

/**
 * A `colorPalette` assignment ruleset in the exact shape `panda cssgen` emits:
 * the 50–950 scale always, plus one line per role the hue actually defines.
 * `roles: []` reproduces a Panda-default hue the preset never gave role tokens.
 */
function paletteRuleset(
  selector: string,
  hue: string,
  roles: string[],
): string {
  const lines = [...['50', '500', '950'], ...roles].map(
    (suffix) =>
      `  --colors-color-palette-${suffix}: var(--colors-${hue}-${suffix});`,
  );
  return `${selector} {\n${lines.join('\n')}\n}`;
}

/** The reference side: a variant that styles with a palette role. */
const badgeSolid =
  '.badge--variant_solid {\n  background: var(--colors-color-palette-solid-bg);\n}';

describe('scanGeneratedCss — roleless colorPalette', () => {
  it('errors on a palette that defines no role for a property styled with it', () => {
    // One assignable palette, and it lacks the role: the miss is definite.
    const css = [
      healthyCss,
      paletteRuleset('.badge--colorPalette_violet', 'violet', []),
      badgeSolid,
    ].join('\n');
    const report = scanGeneratedCss(css);
    expect(report.ok).toBe(false);
    expect(
      report.issues.find((i) => i.kind === 'roleless-color-palette'),
    ).toMatchObject({
      kind: 'roleless-color-palette',
      severity: 'error',
      scope: 'badge',
      selector: '.badge--variant_solid',
      palette: 'violet',
      role: 'solid-bg',
    });
  });

  it('reports the line of the declaration that reads the role', () => {
    const css = [
      healthyCss,
      paletteRuleset('.badge--colorPalette_violet', 'violet', []),
      '',
      '',
      badgeSolid,
    ].join('\n');
    const declarationLine =
      css
        .split('\n')
        .findIndex((l) => l.includes('var(--colors-color-palette-solid-bg)')) +
      1;
    const issue = scanGeneratedCss(css).issues.find(
      (i) => i.kind === 'roleless-color-palette',
    );
    expect(issue?.line).toBe(declarationLine);
  });

  it('passes a role-carrying palette', () => {
    const css = [
      healthyCss,
      paletteRuleset('.badge--colorPalette_green', 'green', ROLES),
      badgeSolid,
    ].join('\n');
    const report = scanGeneratedCss(css);
    expect(report.ok).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it('warns (does not error) when only some assignable palettes lack the role', () => {
    // `badge` can take `green` (role-complete) or `violet` (roleless), so the
    // pairing that breaks is possible but unproven — an app may never make it.
    const css = [
      healthyCss,
      paletteRuleset('.badge--colorPalette_green', 'green', ROLES),
      paletteRuleset('.badge--colorPalette_violet', 'violet', []),
      badgeSolid,
    ].join('\n');
    const report = scanGeneratedCss(css);
    const roleless = report.issues.filter(
      (i) => i.kind === 'roleless-color-palette',
    );
    expect(roleless).toHaveLength(1);
    expect(roleless[0]).toMatchObject({
      severity: 'warn',
      palette: 'violet',
      role: 'solid-bg',
    });
    // Reported, but the check still passes — nothing else in the sheet fails.
    expect(report.ok).toBe(true);
  });

  it('errors when every assignable palette lacks the role', () => {
    // Two palettes, neither role-complete: no combination avoids the drop.
    const css = [
      healthyCss,
      paletteRuleset('.badge--colorPalette_violet', 'violet', []),
      paletteRuleset('.badge--colorPalette_teal', 'teal', ['subtle-bg']),
      badgeSolid,
    ].join('\n');
    const report = scanGeneratedCss(css);
    const roleless = report.issues.filter(
      (i) => i.kind === 'roleless-color-palette',
    );
    expect(roleless.map((i) => i.palette).sort()).toEqual(['teal', 'violet']);
    expect(roleless.every((i) => i.severity === 'error')).toBe(true);
    expect(report.ok).toBe(false);
  });

  it('ignores a role reference with no colorPalette in scope', () => {
    // Nothing assigns a palette to `badge`, so the role may well be supplied by
    // an ancestor — there is no assignment to contradict.
    const report = scanGeneratedCss(`${healthyCss}\n${badgeSolid}`);
    expect(report.ok).toBe(true);
  });

  it('reports every missing role a scope references', () => {
    const css = [
      healthyCss,
      paletteRuleset('.badge--colorPalette_violet', 'violet', ['solid-bg']),
      badgeSolid,
      '.badge--variant_solid {\n  color: var(--colors-color-palette-solid-fg);\n}',
    ].join('\n');
    const roleless = scanGeneratedCss(css).issues.filter(
      (i) => i.kind === 'roleless-color-palette',
    );
    // `solid-bg` is mapped; only `solid-fg` is missing.
    expect(roleless.map((i) => i.role)).toEqual(['solid-fg']);
  });

  it('treats a slot recipe as one scope (root assigns, slot consumes)', () => {
    const css = [
      healthyCss,
      paletteRuleset('.chip__root--colorPalette_violet', 'violet', []),
      '.chip__dismiss:is(:hover, [data-hover]) {\n  background: var(--colors-color-palette-subtle-bg);\n}',
    ].join('\n');
    expect(
      scanGeneratedCss(css).issues.find(
        (i) => i.kind === 'roleless-color-palette',
      ),
    ).toMatchObject({ scope: 'chip', palette: 'violet', role: 'subtle-bg' });
  });

  it('splits a selector list at top level, not on commas inside :is()', () => {
    // Splitting on every comma would cut this into `.badge--variant_solid:is(.a--x`
    // and `.b--y)`, scoping the reference to `a`/`b` — recipes that do not exist —
    // and losing the finding.
    const selector = '.badge--variant_solid:is(.a--x, .b--y)';
    const css = [
      healthyCss,
      paletteRuleset('.badge--colorPalette_violet', 'violet', []),
      `${selector} {\n  background: var(--colors-color-palette-solid-bg);\n}`,
    ].join('\n');
    const roleless = scanGeneratedCss(css).issues.filter(
      (i) => i.kind === 'roleless-color-palette',
    );
    expect(roleless).toHaveLength(1);
    expect(roleless[0]).toMatchObject({
      scope: 'badge',
      selector,
      palette: 'violet',
      role: 'solid-bg',
    });
  });

  it('scopes a reference to the element it styles, not to an ancestor recipe', () => {
    // The palette is assigned on an outer recipe; doctor does not simulate the
    // cascade, so the inner reference is not attributed to `panel`.
    const css = [
      healthyCss,
      paletteRuleset('.panel__root--colorPalette_violet', 'violet', []),
      '.panel__root .badge--variant_solid {\n  background: var(--colors-color-palette-solid-bg);\n}',
    ].join('\n');
    expect(scanGeneratedCss(css).ok).toBe(true);
  });

  it('ignores atomic colorPalette utilities (cascade-ambiguous by design)', () => {
    const css = [
      healthyCss,
      paletteRuleset('.color-palette_violet', 'violet', []),
      '.bg_colorPalette\\.solid\\.bg {\n  background: var(--colors-color-palette-solid-bg);\n}',
    ].join('\n');
    expect(scanGeneratedCss(css).ok).toBe(true);
  });

  it('ignores a role reference that supplies a fallback', () => {
    // A fallback means the declaration survives, so nothing is silently dropped.
    const css = [
      healthyCss,
      paletteRuleset('.badge--colorPalette_violet', 'violet', []),
      '.badge--variant_solid {\n  background: var(--colors-color-palette-solid-bg, transparent);\n}',
    ].join('\n');
    expect(scanGeneratedCss(css).ok).toBe(true);
  });

  it('does not mistake an atomic utility for a recipe scope named after its property', () => {
    // `.bg_surface` must not register a `bg` scope that swallows references.
    const css = [
      healthyCss,
      '.bg_surface {\n  background: var(--colors-color-palette-solid-bg);\n}',
      paletteRuleset('.bg_violet', 'violet', []),
    ].join('\n');
    expect(scanGeneratedCss(css).ok).toBe(true);
  });
});

/** Minimal in-memory FileSystemOps backed by a Map. */
function makeFs(files: Record<string, string>) {
  const store = new Map(Object.entries(files));
  const fs = {
    exists: (p: string) => store.has(p),
    readFile: (p: string) => store.get(p) ?? '',
    removeDir: (p: string) => void store.delete(p),
    readJson: () => ({}),
    realpath: (p: string) => p,
    isSymlink: () => false,
    createSymlink: () => {},
    createDir: () => {},
    readDir: () => [],
    isDirectory: () => false,
  } as unknown as FileSystemOps;
  return { fs, store };
}

const silentLogger: Logger = {
  info() {},
  warn() {},
  error() {},
  debug() {},
};

describe('DoctorCommand.execute', () => {
  it('scans an explicit stylesheet path (healthy → true)', () => {
    const { fs } = makeFs({ '/proj/styled-system/styles.css': healthyCss });
    const executor = {
      exec: () => ({ stdout: '', stderr: '', success: true }),
      execQuiet: () => true,
    } as CommandExecutor;
    const cmd = new DoctorCommand(fs, silentLogger, executor);
    expect(cmd.execute(['styled-system/styles.css'], '/proj')).toBe(true);
  });

  it('--codegen runs panda cssgen to a temp file and scans it', () => {
    const { fs, store } = makeFs({});
    // The fake executor "writes" the codegen output to the --outfile path.
    const executor = {
      exec: (cmd: string) => {
        const m = cmd.match(/--outfile "([^"]+)"/);
        if (m) store.set(m[1], healthyCss);
        return { stdout: '', stderr: '', success: true };
      },
      execQuiet: () => true,
    } as CommandExecutor;
    const cmd = new DoctorCommand(fs, silentLogger, executor);
    expect(cmd.execute(['--codegen'], '/proj')).toBe(true);
    // The temp file is cleaned up after scanning.
    expect(store.size).toBe(0);
  });

  it('--codegen surfaces unhealthy CSS as a failure', () => {
    const { fs, store } = makeFs({});
    const executor = {
      exec: (cmd: string) => {
        const m = cmd.match(/--outfile "([^"]+)"/);
        if (m) store.set(m[1], `${healthyCss}\n.x { color: text.subtle; }`);
        return { stdout: '', stderr: '', success: true };
      },
      execQuiet: () => true,
    } as CommandExecutor;
    const cmd = new DoctorCommand(fs, silentLogger, executor);
    expect(cmd.execute(['--codegen'], '/proj')).toBe(false);
  });

  it('fails (non-zero exit) when a roleless palette fires', () => {
    // `cli.ts` maps this boolean straight onto the process exit code, so a false
    // return here is the non-zero exit that gates CI.
    const rolelessCss = [
      healthyCss,
      paletteRuleset('.badge--colorPalette_violet', 'violet', []),
      badgeSolid,
    ].join('\n');
    const { fs } = makeFs({ '/proj/styled-system/styles.css': rolelessCss });
    const messages: string[] = [];
    const logger: Logger = {
      ...silentLogger,
      error: (m: string) => void messages.push(m),
    };
    const executor = {
      exec: () => ({ stdout: '', stderr: '', success: true }),
      execQuiet: () => true,
    } as CommandExecutor;
    const cmd = new DoctorCommand(fs, logger, executor);
    expect(cmd.execute(['styled-system/styles.css'], '/proj')).toBe(false);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('.badge--variant_solid');
    expect(messages[0]).toContain('violet');
    expect(messages[0]).toContain('solid-bg');
  });

  it('warns and still exits zero when a roleless pairing is only possible', () => {
    // `cli.ts` maps this boolean onto the process exit code, so `true` here is
    // the exit 0 that lets CI pass with the warning printed.
    const partialMissCss = [
      healthyCss,
      paletteRuleset('.badge--colorPalette_green', 'green', ROLES),
      paletteRuleset('.badge--colorPalette_violet', 'violet', []),
      badgeSolid,
    ].join('\n');
    const { fs } = makeFs({ '/proj/styled-system/styles.css': partialMissCss });
    const errors: string[] = [];
    const warnings: string[] = [];
    const logger: Logger = {
      ...silentLogger,
      error: (m: string) => void errors.push(m),
      warn: (m: string) => void warnings.push(m),
    };
    const executor = {
      exec: () => ({ stdout: '', stderr: '', success: true }),
      execQuiet: () => true,
    } as CommandExecutor;
    const cmd = new DoctorCommand(fs, logger, executor);
    expect(cmd.execute(['styled-system/styles.css'], '/proj')).toBe(true);
    expect(errors).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('violet');
    expect(warnings[0]).toContain('solid-bg');
  });

  it('reports failure when codegen itself fails', () => {
    const { fs } = makeFs({});
    const executor = {
      exec: () => ({ stdout: '', stderr: 'panda: not found', success: false }),
      execQuiet: () => false,
    } as CommandExecutor;
    const cmd = new DoctorCommand(fs, silentLogger, executor);
    expect(cmd.execute(['--codegen'], '/proj')).toBe(false);
  });
});
