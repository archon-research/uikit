import type { CommandExecutor } from '../command-executor.js';
import { shellEscape } from '../shell-utils.js';
import { resolveCliBinary } from '../tool-binaries.js';

/**
 * Lint command - forwards to oxlint
 */
export class LintCommand {
  private executor: CommandExecutor;

  constructor(executor: CommandExecutor) {
    this.executor = executor;
  }

  execute(args: string[]): void {
    const escapedArgs = args.map((arg) => shellEscape(arg)).join(' ');
    const oxlintBinary = shellEscape(resolveCliBinary('oxlint', 'bin/oxlint'));

    this.executor.exec(`${oxlintBinary} ${escapedArgs}`.trim(), {
      cwd: process.cwd(),
    });
  }
}
