import { describe, expect, it } from 'vitest';

import type { CommandExecutor, ExecResult } from '../command-executor.js';
import { LintCommand } from './lint.js';

function executorReturning(success: boolean): CommandExecutor {
  const result: ExecResult = { stdout: '', stderr: '', success };
  return {
    exec: () => result,
    execQuiet: () => success,
  };
}

describe('LintCommand', () => {
  it('reports success when oxlint exits clean', () => {
    expect(new LintCommand(executorReturning(true)).execute(['.'])).toBe(true);
  });

  it('reports failure when oxlint finds violations', () => {
    // `cli.ts` maps this boolean onto the process exit code — a swallowed
    // failure here left the lint gate unable to fail CI.
    expect(new LintCommand(executorReturning(false)).execute(['.'])).toBe(
      false,
    );
  });
});
