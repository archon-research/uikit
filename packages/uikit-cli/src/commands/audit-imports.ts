import type { CommandExecutor } from '../command-executor.js';
import { shellEscape } from '../shell-utils.js';

/**
 * Audit-imports command - finds direct primitive imports in consumer repos.
 * Includes legacy Base UI import detection for migration cleanup.
 */
export class AuditImportsCommand {
  private executor: CommandExecutor;

  constructor(executor: CommandExecutor) {
    this.executor = executor;
  }

  execute(args: string[]): void {
    const targets = args.length > 0 ? args : ['.'];
    const escapedTargets = targets
      .map((target) => shellEscape(target))
      .join(' ');

    const command = [
      'rg -n',
      "-g '*.{ts,tsx,js,jsx,mjs,cjs}'",
      "--glob '!**/dist/**'",
      "--glob '!**/node_modules/**'",
      '"from\\s+[\\\"\\\']@(base|ark)-ui/react(?:/[^\\\"\\\']*)?[\\\"\\\']|require\\(\\s*[\\\"\\\']@(base|ark)-ui/react(?:/[^\\\"\\\']*)?[\\\"\\\']\\s*\\)"',
      escapedTargets,
    ].join(' ');

    const result = this.executor.exec(command, {
      cwd: process.cwd(),
      silent: true,
    });

    const output = result.stdout.trim();
    if (!output) {
      console.log(
        'No direct @ark-ui/react or legacy @base-ui/react imports found.',
      );
      return;
    }

    console.log(output);
    console.log(
      '\nFound direct primitive imports. Prefer @archon-research/design-system exports.',
    );
  }
}
