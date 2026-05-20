import type { CommandExecutor } from "../command-executor.js";
import { shellEscape } from "../shell-utils.js";

/**
 * Lint command - forwards to oxlint
 */
export class LintCommand {
  private executor: CommandExecutor;

  constructor(executor: CommandExecutor) {
    this.executor = executor;
  }

  execute(args: string[]): void {
    const escapedArgs = args.map((arg) => shellEscape(arg)).join(" ");
    this.executor.exec(`npm exec -- oxlint ${escapedArgs}`.trim(), { cwd: process.cwd() });
  }
}
