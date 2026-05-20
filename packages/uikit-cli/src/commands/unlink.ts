import type { CommandExecutor } from '../command-executor.js';
import type { Logger } from '../logger.js';
import type { PackageDiscovery } from '../package-discovery.js';

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
    uikitRoot: string,
    discovery: PackageDiscovery,
  ): void {
    // Load workspaces and determine requirements
    const uikitWorkspaces = discovery.loadWorkspaces(uikitRoot);
    const consumerWorkspaces = discovery.loadWorkspaces(consumerRoot);

    const uikitPackages = uikitWorkspaces.filter((ws) =>
      String(ws.name ?? '').startsWith('@archon-research/'),
    );

    const supportedNames = new Set(
      uikitPackages.map((pkg) => pkg.name ?? '').filter((name) => name !== ''),
    );

    // Collect workspace requirements
    const neededByWorkspace = new Map<string, string[]>();
    const allPackages = new Set<string>();
    for (const ws of consumerWorkspaces) {
      const needed = new Set<string>();
      for (const depName of Object.keys(ws.dependencies)) {
        if (supportedNames.has(depName)) {
          needed.add(depName);
          allPackages.add(depName);
        }
      }
      if (needed.size > 0) {
        neededByWorkspace.set(ws.location, [...needed]);
      }
    }

    const packages = [...allPackages];
    const workspaces = [...neededByWorkspace.keys()];
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
    const installResult = this.executor.exec(
      'npm_config_min_release_age=0 npm install',
      {
        cwd: consumerRoot,
      },
    );

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
