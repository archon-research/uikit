import path from 'node:path';
import type { FileSystemOps } from './fs-utils.js';
import type { WorkspaceInfo } from './types.js';

/**
 * Package and workspace discovery for monorepos
 */
export class PackageDiscovery {
  private fs: FileSystemOps;

  constructor(fs: FileSystemOps) {
    this.fs = fs;
  }

  /**
   * Find consumer workspace root by walking up looking for package.json with workspaces
   */
  findConsumerRoot(startDir: string): string {
    let current = startDir;

    while (true) {
      const pkgPath = path.join(current, 'package.json');

      if (this.fs.exists(pkgPath)) {
        try {
          const pkg = this.fs.readJson<{ workspaces?: unknown }>(pkgPath);
          if (pkg.workspaces) {
            return current;
          }
        } catch {
          // Continue searching if parse fails
        }
      }

      const parent = path.dirname(current);
      if (parent === current) {
        throw new Error(
          `Could not find consumer workspace root (no package.json with workspaces field)\n` +
            `Searched from: ${startDir}\n` +
            `Suggestion: Run from inside a workspace-based monorepo`,
        );
      }
      current = parent;
    }
  }

  /**
   * Find uikit root by walking up looking for valid uikit monorepo structure
   */
  findUIKitRoot(startDir: string): string | null {
    let current = startDir;

    while (true) {
      if (this.isValidUIKitRoot(current)) {
        return current;
      }

      const parent = path.dirname(current);
      if (parent === current) {
        return null;
      }
      current = parent;
    }
  }

  /**
   * Find uikit root from consumer by looking for sibling "uikit" directory
   */
  findUIKitRootFromConsumer(consumerRoot: string): string | null {
    const candidateNames = ['uikit'];
    let current = consumerRoot;

    while (true) {
      for (const candidateName of candidateNames) {
        const candidate = path.join(current, candidateName);
        if (this.isValidUIKitRoot(candidate)) {
          return candidate;
        }
      }

      const parent = path.dirname(current);
      if (parent === current) {
        return null;
      }
      current = parent;
    }
  }

  /**
   * Check if directory is a valid uikit root (has design-system package)
   */
  isValidUIKitRoot(rootDir: string): boolean {
    if (!this.fs.exists(rootDir)) {
      return false;
    }

    try {
      const workspaces = this.loadWorkspaces(rootDir);
      return workspaces.some((ws) => ws.name === '@archon-research/design-system');
    } catch {
      return false;
    }
  }

  /**
   * Load all workspaces from a monorepo root
   */
  loadWorkspaces(rootDir: string): WorkspaceInfo[] {
    const patterns = this.getWorkspacePatterns(rootDir);
    const workspaces: WorkspaceInfo[] = [];

    for (const pattern of patterns) {
      const resolved = this.resolveWorkspacePattern(rootDir, pattern);
      for (const dir of resolved) {
        const pkgPath = path.join(dir, 'package.json');
        if (!this.fs.exists(pkgPath)) {
          continue;
        }

        try {
          const pkg = this.fs.readJson<{
            name?: string;
            dependencies?: Record<string, string>;
          }>(pkgPath);

          workspaces.push({
            name: pkg.name ?? null,
            location: path.relative(rootDir, dir),
            path: dir,
            dependencies: pkg.dependencies ?? {},
          });
        } catch {
          // Skip invalid package.json
        }
      }
    }

    return workspaces.filter((ws) => Boolean(ws.name));
  }

  private getWorkspacePatterns(rootDir: string): string[] {
    const pkgPath = path.join(rootDir, 'package.json');
    if (!this.fs.exists(pkgPath)) {
      return [];
    }

    try {
      const pkg = this.fs.readJson<{ workspaces?: string[] | { packages?: string[] } }>(
        pkgPath,
      );

      if (Array.isArray(pkg.workspaces)) {
        return pkg.workspaces;
      }
      if (pkg.workspaces && Array.isArray(pkg.workspaces.packages)) {
        return pkg.workspaces.packages;
      }
    } catch {
      // Return empty if parse fails
    }

    return [];
  }

  private resolveWorkspacePattern(rootDir: string, pattern: string): string[] {
    // Handle simple glob patterns like "packages/*"
    if (pattern.includes('*')) {
      // Only support "dir/*" pattern for now
      if (pattern.endsWith('/*')) {
        const baseDir = pattern.slice(0, -2);
        const basePath = path.join(rootDir, baseDir);

        if (!this.fs.exists(basePath) || !this.fs.isDirectory(basePath)) {
          return [];
        }

        const entries = this.fs.readDir(basePath);
        return entries
          .filter((entry) => !entry.startsWith('.'))
          .map((entry) => path.join(basePath, entry))
          .filter((p) => this.fs.isDirectory(p));
      }

      // Unsupported pattern
      return [];
    }

    // Static pattern, return as-is if it's a directory
    const fullPath = path.join(rootDir, pattern);
    return this.fs.isDirectory(fullPath) ? [fullPath] : [];
  }
}
