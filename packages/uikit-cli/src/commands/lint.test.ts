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

  it('never injects a config flag', () => {
    // oxlint resolves `oxlint.config.ts` per target file by walking up from it.
    // Injecting `-c` would replace that with whatever config sits in cwd, so a
    // run spanning several packages — the git-hook shape — would lint them all
    // with one package's rules. Verified against oxlint 1.78: with `-c` the
    // run exits 0 on a violation that it otherwise reports.
    const { executor, command } = recordingExecutor();
    new LintCommand(executor).execute(['packages/a/src', 'packages/b/src']);
    // Matched as a whole argument: the binary path itself contains "-c"
    // (".../uikit-cli/..."), so a bare substring check passes vacuously.
    expect(command()).not.toMatch(/\s-c\s/);
    expect(command()).not.toContain('--config');
    expect(command()).not.toContain('oxlint.config.ts');
  });

  it('fails the run on warnings by default', () => {
    // The shared presets set `correctness`/`suspicious` to `warn`, and oxlint
    // exits 0 on warnings — so without this the presets reported violations
    // and passed anyway.
    const { executor, command } = recordingExecutor();
    new LintCommand(executor).execute(['src']);
    expect(command()).toContain('--max-warnings=0');
  });

  it.each([['--max-warnings=10'], ['--max-warnings'], ['--deny-warnings']])(
    'respects a caller-supplied %s',
    (flag) => {
      const { executor, command } = recordingExecutor();
      new LintCommand(executor).execute([flag, 'src']);
      expect(command()).not.toContain('--max-warnings=0');
    },
  );

  it('does not treat -W as a warning threshold', () => {
    // `-W`/`--warn` sets a rule's severity; it says nothing about the exit
    // code, so the default must still apply.
    const { executor, command } = recordingExecutor();
    new LintCommand(executor).execute(['-W', 'no-console', 'src']);
    expect(command()).toContain('--max-warnings=0');
  });
});
