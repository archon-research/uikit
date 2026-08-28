import path from 'node:path';

import type { CommandExecutor } from '../command-executor.js';
import type { FileSystemOps } from '../fs-utils.js';
import { shellEscape } from '../shell-utils.js';
import { resolveCliBinary } from '../tool-binaries.js';

/**
 * Lint command - forwards to oxlint with config detection
 */
export class LintCommand {
  private executor: CommandExecutor;
  private fs: FileSystemOps;

  constructor(executor: CommandExecutor, fs: FileSystemOps) {
    this.executor = executor;
    this.fs = fs;
  }

  execute(args: string[]): boolean {
    const modifiedArgs = [...args];

    // oxlint discovers `oxlint.config.ts` on its own, but only relative to cwd.
    // A caller whose cwd is not the directory holding the config — a git hook,
    // which usually runs at the repo or workspace root — silently lints with
    // oxlint's built-in defaults and passes clean. Pointing at the config
    // explicitly mirrors what `format` already does for `.oxfmtrc.ts`.
    if (!this.hasConfigFlag(modifiedArgs)) {
      const configPath = path.join(process.cwd(), 'oxlint.config.ts');
      if (this.fs.exists(configPath)) {
        modifiedArgs.unshift('./oxlint.config.ts');
        modifiedArgs.unshift('-c');
      }
    }

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

  private hasConfigFlag(args: string[]): boolean {
    return args.some(
      (arg) =>
        arg === '-c' || arg === '--config' || arg.startsWith('--config='),
    );
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
