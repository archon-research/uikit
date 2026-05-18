import type { CommandExecutor } from '../command-executor.js';
import type { Logger } from '../logger.js';

/**
 * Unlink command - simplified version without registry checks
 */
export class UnlinkCommand {
  private executor: CommandExecutor;
  private logger: Logger;

  constructor(executor: CommandExecutor, logger: Logger) {
    this.executor = executor;
    this.logger = logger;
  }

  execute(
    consumerRoot: string,
    packages: string[],
    workspaces: string[],
  ): void {
    this.logger.debug('Starting unlink command', {
      consumerRoot,
      packageCount: packages.length,
    });

    // Unlink at root level
    this.logger.info('Unlinking packages at root level...');
    const packageArgs = packages.map((name) => `"${name}"`).join(' ');

    if (packageArgs) {
      const result = this.executor.execQuiet(
        `npm unlink ${packageArgs} --package-lock=false --save=false`,
        { cwd: consumerRoot },
      );

      if (!result) {
        this.logger.warn('Root unlink had issues, continuing...');
      }
    }

    // Unlink per workspace
    for (const workspace of workspaces) {
      this.logger.debug(`Unlinking packages for workspace: ${workspace}`);
      this.executor.execQuiet(
        `npm unlink ${packageArgs} --workspace "${workspace}" --package-lock=false --save=false`,
        { cwd: consumerRoot },
      );
    }

    // Restore from registry
    this.logger.info('Restoring packages from registry...');
    const installResult = this.executor.exec('npm_config_min_release_age=0 npm install', {
      cwd: consumerRoot,
    });

    if (!installResult.success) {
      this.logger.error('Failed to restore packages from registry');
      this.logger.warn(
        'You may need to run `uikit-cli link` again to restore local links',
      );
      throw new Error('Unlink failed: could not restore registry packages');
    }

    this.logger.info('✓ Packages unlinked and restored from registry');
  }
}
