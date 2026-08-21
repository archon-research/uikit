import { describe, expect, it } from 'vitest';

import type { CommandExecutor, ExecResult } from '../command-executor.js';
import type { FileSystemOps } from '../fs-utils.js';
import { FormatCommand } from './format.js';

function executorReturning(success: boolean): CommandExecutor {
  const result: ExecResult = { stdout: '', stderr: '', success };
  return {
    exec: () => result,
    execQuiet: () => success,
  };
}

const noConfigFs = { exists: () => false } as unknown as FileSystemOps;

describe('FormatCommand', () => {
  it('reports success when oxfmt exits clean', () => {
    const cmd = new FormatCommand(executorReturning(true), noConfigFs);
    expect(cmd.execute(['--check', '.'])).toBe(true);
  });

  it('reports failure when oxfmt finds drift', () => {
    // `cli.ts` maps this boolean onto the process exit code — a swallowed
    // failure here is what once let `format --check` pass CI on drift.
    const cmd = new FormatCommand(executorReturning(false), noConfigFs);
    expect(cmd.execute(['--check', '.'])).toBe(false);
  });
});
