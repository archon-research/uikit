import type { CommandExecutor } from '../command-executor.js';
import { shellEscape } from '../shell-utils.js';
import { resolveCliBinary } from '../tool-binaries.js';

/**
 * Lint command - forwards to oxlint
 *
 * Deliberately does *not* inject `-c`, unlike `format`. oxfmt only
 * auto-discovers the `.json` form of its config, so `format` has to point at
 * `.oxfmtrc.ts` itself; oxlint resolves `oxlint.config.ts` per target file by
 * walking up from it, so every package in a multi-target run gets its own
 * config with no help. Injecting `-c ./oxlint.config.ts` would *replace* that
 * per-package resolution with whatever config happens to sit in cwd — in the
 * git-hook shape (cwd at the repo root, targets in several packages) that
 * silently drops the packages' own rules.
 */
export class LintCommand {
  private executor: CommandExecutor;

  constructor(executor: CommandExecutor) {
    this.executor = executor;
  }

  execute(args: string[]): boolean {
    const modifiedArgs = [...args];

    // oxlint exits 0 on warnings. The shared presets set `correctness` and
    // `suspicious` to `warn`, so without this every violation they describe is
    // reported and then ignored. Callers who want warnings to stay advisory can
    // pass their own `--max-warnings`/`--deny-warnings` and keep it.
    if (!this.hasWarningLimitFlag(modifiedArgs)) {
      modifiedArgs.push('--max-warnings=0');
    }

    const escapedArgs = modifiedArgs.map((arg) => shellEscape(arg)).join(' ');
    const oxlintBinary = shellEscape(resolveCliBinary('oxlint', 'bin/oxlint'));

    return this.executor.exec(`${oxlintBinary} ${escapedArgs}`.trim(), {
      cwd: process.cwd(),
    }).success;
  }

  // Only the two flags that govern the *exit code* count here. `-W`/`--warn`
  // looks related but sets a rule's severity, and must not suppress the
  // default.
  private hasWarningLimitFlag(args: string[]): boolean {
    return args.some(
      (arg) =>
        arg === '--max-warnings' ||
        arg.startsWith('--max-warnings=') ||
        arg === '--deny-warnings',
    );
  }
}
