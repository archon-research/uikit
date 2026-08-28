import { describe, expect, it } from 'vitest';

import type { CommandExecutor, ExecResult } from '../command-executor.js';
import type { FileSystemOps } from '../fs-utils.js';
import { LintCommand } from './lint.js';

function executorReturning(success: boolean): CommandExecutor {
  const result: ExecResult = { stdout: '', stderr: '', success };
  return {
    exec: () => result,
    execQuiet: () => success,
  };
}

/** Captures the command line `LintCommand` builds instead of running it. */
function recordingExecutor(): {
  executor: CommandExecutor;
  command: () => string;
} {
  let captured = '';
  return {
    executor: {
      exec: (cmd: string) => {
        captured = cmd;
        return { stdout: '', stderr: '', success: true } satisfies ExecResult;
      },
      execQuiet: () => true,
    },
    command: () => captured,
  };
}

const noConfigFs = { exists: () => false } as unknown as FileSystemOps;
const withConfigFs = { exists: () => true } as unknown as FileSystemOps;

describe('LintCommand', () => {
  it('reports success when oxlint exits clean', () => {
    expect(
      new LintCommand(executorReturning(true), noConfigFs).execute(['.']),
    ).toBe(true);
  });

  it('reports failure when oxlint finds violations', () => {
    // `cli.ts` maps this boolean onto the process exit code — a swallowed
    // failure here left the lint gate unable to fail CI.
    expect(
      new LintCommand(executorReturning(false), noConfigFs).execute(['.']),
    ).toBe(false);
  });

  it('points oxlint at oxlint.config.ts when cwd holds one', () => {
    // oxlint only auto-discovers the config relative to cwd, so a caller run
    // from elsewhere (a git hook, typically) silently linted with defaults.
    const { executor, command } = recordingExecutor();
    new LintCommand(executor, withConfigFs).execute(['src']);
    expect(command()).toContain('-c ./oxlint.config.ts');
  });

  it('leaves an explicit config flag alone', () => {
    const { executor, command } = recordingExecutor();
    new LintCommand(executor, withConfigFs).execute(['-c', 'other.ts', 'src']);
    expect(command()).not.toContain('./oxlint.config.ts');
  });

  it('omits the config flag when cwd has no oxlint.config.ts', () => {
    const { executor, command } = recordingExecutor();
    new LintCommand(executor, noConfigFs).execute(['src']);
    expect(command()).not.toContain('-c ');
  });

  it('fails the run on warnings by default', () => {
    // The shared presets set `correctness`/`suspicious` to `warn`, and oxlint
    // exits 0 on warnings — so without this the presets reported violations
    // and passed anyway.
    const { executor, command } = recordingExecutor();
    new LintCommand(executor, noConfigFs).execute(['src']);
    expect(command()).toContain('--max-warnings=0');
  });

  it.each([['--max-warnings=10'], ['--max-warnings'], ['--deny-warnings']])(
    'respects a caller-supplied %s',
    (flag) => {
      const { executor, command } = recordingExecutor();
      new LintCommand(executor, noConfigFs).execute([flag, 'src']);
      expect(command()).not.toContain('--max-warnings=0');
    },
  );

  it('does not treat -W as a warning threshold', () => {
    // `-W`/`--warn` sets a rule's severity; it says nothing about the exit
    // code, so the default must still apply.
    const { executor, command } = recordingExecutor();
    new LintCommand(executor, noConfigFs).execute(['-W', 'no-console', 'src']);
    expect(command()).toContain('--max-warnings=0');
  });
});
