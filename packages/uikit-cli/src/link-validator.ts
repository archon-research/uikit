import path from 'node:path';
import type { FileSystemOps } from './fs-utils.js';
import type { Logger } from './logger.js';
import type { ValidationResult, SymlinkStatus } from './types.js';

/**
 * Validates link state without npm registry checks
 */
export class LinkValidator {
  private fs: FileSystemOps;
  private logger: Logger;

  constructor(fs: FileSystemOps, logger: Logger) {
    this.fs = fs;
    this.logger = logger;
  }

  /**
   * Validate all expected links in consumer
   */
  validateLinkedPackages(
    consumerRoot: string,
    expectedLinks: Map<string, string>,
  ): ValidationResult {
    const issues: ValidationResult['issues'] = [];

    this.logger.debug('Validating linked packages', {
      consumerRoot,
      packageCount: expectedLinks.size,
    });

    for (const [packageName, expectedTarget] of expectedLinks) {
      const linkPath = path.join(consumerRoot, 'node_modules', packageName);
      const status = this.validateSymlink(linkPath, expectedTarget);

      if (status !== 'valid') {
        issues.push({
          type: status,
          package: packageName,
          details: this.getStatusDetails(linkPath, expectedTarget, status),
        });
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Get all currently linked packages in consumer
   */
  getLinkedPackages(consumerRoot: string): Map<string, string> {
    const links = new Map<string, string>();
    const nodeModules = path.join(consumerRoot, 'node_modules');

    if (!this.fs.exists(nodeModules)) {
      return links;
    }

    // Check @archon-research scope
    const scopeDir = path.join(nodeModules, '@archon-research');
    if (!this.fs.exists(scopeDir)) {
      return links;
    }

    const packages = this.fs.readDir(scopeDir);
    for (const pkg of packages) {
      const pkgPath = path.join(scopeDir, pkg);
      if (this.fs.isSymlink(pkgPath)) {
        try {
          const target = this.fs.realpath(pkgPath);
          links.set(`@archon-research/${pkg}`, target);
        } catch {
          // Skip broken symlinks
        }
      }
    }

    return links;
  }

  /**
   * Validate a single symlink
   */
  validateSymlink(linkPath: string, expectedTarget: string): SymlinkStatus {
    if (!this.fs.exists(linkPath)) {
      return 'missing';
    }

    if (!this.fs.isSymlink(linkPath)) {
      // Not a symlink, might be a regular install
      return 'missing';
    }

    try {
      const actualTarget = this.fs.realpath(linkPath);
      const normalizedExpected = path.resolve(expectedTarget);
      const normalizedActual = path.resolve(actualTarget);

      if (normalizedActual === normalizedExpected) {
        return 'valid';
      }

      return 'wrong-target';
    } catch {
      return 'broken';
    }
  }

  private getStatusDetails(
    linkPath: string,
    expectedTarget: string,
    status: SymlinkStatus,
  ): string {
    switch (status) {
      case 'missing':
        return `Link does not exist at ${linkPath}`;
      case 'broken':
        return `Symlink exists but points to non-existent location`;
      case 'wrong-target': {
        try {
          const actualTarget = this.fs.realpath(linkPath);
          return `Expected: ${expectedTarget}\nActual: ${actualTarget}`;
        } catch {
          return `Could not read symlink target`;
        }
      }
      default:
        return '';
    }
  }
}
