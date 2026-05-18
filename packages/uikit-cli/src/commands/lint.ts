import type { CommandExecutor } from '../command-executor.js';

const OXLINT_VERSION = '1.62.0';

/**
 * Lint command - forwards to oxlint
 */
export class LintCommand {
  private executor: CommandExecutor;

  constructor(executor: CommandExecutor) {
    this.executor = executor;
  }

  execute(args: string[]): void {
    const escapedArgs = args.map((arg) => this.shellEscape(arg)).join(' ');
    this.executor.exec(
      `npm exec --yes --package oxlint@${OXLINT_VERSION} -- oxlint ${escapedArgs}`.trim(),
      { cwd: process.cwd() },
    );
  }

  private shellEscape(arg: string): string {
    if (/^[a-zA-Z0-9_\-./:=]+$/.test(arg)) {
      return arg;
    }
    return `'${arg.replace(/'/g, "'\\''")}'`;
  }
}
