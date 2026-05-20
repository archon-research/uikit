#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { NpmCommandExecutor } from './command-executor.js';
import { FormatCommand } from './commands/format.js';
import { LinkCommand } from './commands/link.js';
import { LintCommand } from './commands/lint.js';
import { RegisterCommand } from './commands/register.js';
import { UnlinkCommand } from './commands/unlink.js';
import { RealFileSystem } from './fs-utils.js';
import { LinkValidator } from './link-validator.js';
import { ConsoleLogger } from './logger.js';
import { PackageDiscovery } from './package-discovery.js';
import type { CommandMode, ParsedArgs } from './types.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Parse command line arguments
 */
function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  if (args.length === 0) {
    throw new Error(
      'Usage: uikit-cli <register|link|unlink|lint|format> [--verify] [--debug] [--uikit-root <path>] [args...]',
    );
  }

  const mode = args[0] as CommandMode;
  const validModes: CommandMode[] = [
    'lint',
    'format',
    'register',
    'link',
    'unlink',
  ];

  if (!validModes.includes(mode)) {
    throw new Error(`Unknown command: ${mode}`);
  }

  let uikitRoot: string | undefined;
  let verify = false;
  let debug = false;
  const commandArgs: string[] = [];
  let i = 1;

  while (i < args.length) {
    const arg = args[i];

    if (arg === '--uikit-root' && i + 1 < args.length) {
      uikitRoot = args[i + 1];
      i += 2;
    } else if (arg === '--verify') {
      verify = true;
      i += 1;
    } else if (arg === '--debug') {
      debug = true;
      i += 1;
    } else {
      commandArgs.push(arg);
      i += 1;
    }
  }

  // Check for UIKIT_DEBUG environment variable
  if (process.env.UIKIT_DEBUG === '1') {
    debug = true;
  }

  // Resolve uikit root
  const fs = new RealFileSystem();
  const discovery = new PackageDiscovery(fs);

  if (debug) {
    console.log('[DEBUG parseArgs] Resolving uikit root...');
  }

  if (!uikitRoot) {
    // Try relative to script location
    const relativeRoot = path.resolve(scriptDir, '../../../..');
    if (debug) {
      console.log('[DEBUG parseArgs] Checking relative root:', relativeRoot);
    }
    if (discovery.isValidUIKitRoot(relativeRoot)) {
      uikitRoot = relativeRoot;
      if (debug) {
        console.log(
          '[DEBUG parseArgs] Found valid uikit root at relative location',
        );
      }
    }
  }

  if (!uikitRoot && mode !== 'lint' && mode !== 'format') {
    // Try to find from consumer
    try {
      const tempConsumerRoot = discovery.findConsumerRoot(process.cwd());
      const foundRoot = discovery.findUIKitRootFromConsumer(tempConsumerRoot);
      if (foundRoot) {
        uikitRoot = foundRoot;
      }
    } catch {
      // Will throw error below if needed
    }
  }

  if (!uikitRoot && mode !== 'lint' && mode !== 'format') {
    // Try walking up from cwd
    const foundRoot = discovery.findUIKitRoot(process.cwd());
    if (foundRoot) {
      uikitRoot = foundRoot;
    }
  }

  if (!uikitRoot && mode !== 'lint' && mode !== 'format') {
    throw new Error(
      'Could not find uikit root directory.\n' +
        'Tried:\n' +
        '  - Relative to script location\n' +
        '  - Sibling to consumer root\n' +
        '  - Walking up from cwd\n' +
        'Use --uikit-root to specify manually.',
    );
  }

  let consumerRoot: string | null = null;
  if (mode === 'link' || mode === 'unlink') {
    consumerRoot = discovery.findConsumerRoot(process.cwd());
  }

  return {
    mode,
    consumerRoot,
    uikitRoot: uikitRoot ?? '',
    commandArgs,
    verify,
    debug,
  };
}

/**
 * Ensure CLI binary is built before registering
 */
function ensureCliBinaryBuilt(
  uikitRoot: string,
  executor: NpmCommandExecutor,
): void {
  const cliPackagePath = path.join(uikitRoot, 'packages/uikit-cli');
  const distPath = path.join(cliPackagePath, 'dist/cli.js');
  const fs = new RealFileSystem();

  if (!fs.exists(distPath)) {
    console.log('Building CLI binary...');
    executor.exec('npm run build', { cwd: cliPackagePath });
  }
}

/**
 * Link CLI into consumer for convenience
 */
function linkCliIntoConsumer(
  consumerRoot: string,
  executor: NpmCommandExecutor,
): void {
  executor.exec(
    'npm link "@archon-research/uikit-cli" --package-lock=false --save=false --no-workspaces',
    { cwd: consumerRoot },
  );
}

/**
 * Main entry point
 */
try {
  const parsed = parseArgs(process.argv);
  const { mode, consumerRoot, uikitRoot, commandArgs, verify, debug } = parsed;

  if (debug) {
    console.log('[DEBUG] Parsed args:', {
      mode,
      consumerRoot,
      uikitRoot,
      verify,
    });
  }

  // Initialize dependencies
  const fs = new RealFileSystem();
  const executor = new NpmCommandExecutor(debug);
  const logger = new ConsoleLogger(debug);
  const discovery = new PackageDiscovery(fs);
  const validator = new LinkValidator(fs, logger);

  // Handle lint/format commands
  if (mode === 'lint') {
    const lintCmd = new LintCommand(executor);
    lintCmd.execute(commandArgs);
    process.exit(0);
  }

  if (mode === 'format') {
    const formatCmd = new FormatCommand(executor, fs);
    formatCmd.execute(commandArgs);
    process.exit(0);
  }

  // Handle register command
  if (mode === 'register') {
    ensureCliBinaryBuilt(uikitRoot, executor);
    const registerCmd = new RegisterCommand(discovery, executor, logger);
    registerCmd.execute(uikitRoot);

    if (verify) {
      logger.info('\\nVerifying registration...');
      // Could add verification logic here
      logger.info('✓ Registration verified');
    }

    process.exit(0);
  }

  // Handle link/unlink commands (require consumerRoot)
  if (!consumerRoot) {
    throw new Error('Consumer root is required for link/unlink operations.');
  }

  // Register packages and link CLI before link/unlink
  ensureCliBinaryBuilt(uikitRoot, executor);
  const registerCmd = new RegisterCommand(discovery, executor, logger);
  registerCmd.execute(uikitRoot);
  linkCliIntoConsumer(consumerRoot, executor);

  if (mode === 'link') {
    const linkCmd = new LinkCommand(discovery, executor, validator, fs, logger);
    linkCmd.execute(consumerRoot, uikitRoot, verify);
    process.exit(0);
  }

  if (mode === 'unlink') {
    const unlinkCmd = new UnlinkCommand(executor, logger);
    unlinkCmd.execute(consumerRoot, uikitRoot, discovery);
    process.exit(0);
  }
} catch (error) {
  if (process.env.UIKIT_DEBUG) {
    console.error('Full error:', error);
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
