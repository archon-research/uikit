import { describe, expect, it } from 'vitest';

import type { CommandExecutor } from '../command-executor.js';
import type { FileSystemOps } from '../fs-utils.js';
import type { Logger } from '../logger.js';
import {
  DoctorCommand,
  SENTINEL_RECIPE_CLASSES,
  scanGeneratedCss,
} from './doctor.js';

/** A stylesheet with every sentinel present and only resolved declarations. */
const healthyCss = `
${SENTINEL_RECIPE_CLASSES.map((c) => `.${c} { color: var(--colors-text-default); }`).join('\n')}
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

  it('flags missing static-css sentinels', () => {
    // Drop one sentinel; keep the rest.
    const withoutOne = healthyCss.replace(
      `.${SENTINEL_RECIPE_CLASSES[0]} `,
      '.some_other_class ',
    );
    const report = scanGeneratedCss(withoutOne);
    expect(report.ok).toBe(false);
    const issue = report.issues.find((i) => i.kind === 'missing-static-css');
    expect(issue).toBeDefined();
    expect(issue).toMatchObject({ missing: [SENTINEL_RECIPE_CLASSES[0]] });
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
