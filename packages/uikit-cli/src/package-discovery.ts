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
   * Find the consumer root by walking up from `startDir`. Prefers a monorepo
   * root (a `package.json` with a `workspaces` field); if none exists anywhere
   * up the tree, falls back to the nearest single package that depends on an
   * `@archon-research/*` package — so link/unlink work for a plain
   * non-workspaces consumer, not just a monorepo.
   */
  findConsumerRoot(startDir: string): string {
    let current = startDir;
    let singlePackageRoot: string | null = null;

    while (true) {
      const pkgPath = path.join(current, 'package.json');

      if (this.fs.exists(pkgPath)) {
        try {
          const pkg = this.fs.readJson<{
            workspaces?: unknown;
            dependencies?: Record<string, string>;
            devDependencies?: Record<string, string>;
            peerDependencies?: Record<string, string>;
            optionalDependencies?: Record<string, string>;
          }>(pkgPath);
          // A workspaces root always wins (unchanged monorepo behavior).
          if (pkg.workspaces) {
            return current;
          }
          // Otherwise remember the nearest package that consumes uikit, as a
          // fallback if no workspaces root turns up above it.
          if (singlePackageRoot === null && this.dependsOnUikit(pkg)) {
            singlePackageRoot = current;
          }
        } catch {
          // Continue searching if parse fails
        }
      }

      const parent = path.dirname(current);
      if (parent === current) {
        if (singlePackageRoot !== null) {
          return singlePackageRoot;
        }
        throw new Error(
          `Could not find a consumer root.\n` +
            `Searched from: ${startDir}\n` +
            `Found no package.json with a "workspaces" field, and none depending ` +
            `on an @archon-research/* package.\n` +
            `Run from inside your consumer project (a monorepo root or a single ` +
            `package that installs uikit).`,
        );
      }
      current = parent;
    }
  }

  private dependsOnUikit(pkg: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  }): boolean {
    const fields = [
      pkg.dependencies,
      pkg.devDependencies,
      pkg.peerDependencies,
      pkg.optionalDependencies,
    ];
    return fields.some(
      (field) =>
        field &&
        Object.keys(field).some((name) => name.startsWith('@archon-research/')),
    );
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
      return workspaces.some(
        (ws) => ws.name === '@archon-research/design-system',
      );
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

    if (process.env.UIKIT_DEBUG) {
      console.log(
        '[DEBUG loadWorkspaces] rootDir:',
        rootDir,
        'patterns:',
        patterns,
      );
    }

    for (const pattern of patterns) {
      const resolved = this.resolveWorkspacePattern(rootDir, pattern);
      if (process.env.UIKIT_DEBUG) {
        console.log(
          '[DEBUG loadWorkspaces] pattern:',
          pattern,
          'resolved to:',
          resolved,
        );
      }
      for (const dir of resolved) {
        const ws = this.readPackageAsWorkspace(rootDir, dir);
        if (ws) {
          workspaces.push(ws);
        } else if (process.env.UIKIT_DEBUG) {
          console.log(
            '[DEBUG loadWorkspaces] Skipping (no/invalid package.json):',
            dir,
          );
        }
      }
    }

    return workspaces.filter((ws) => Boolean(ws.name));
  }

  /**
   * Load consumer workspaces, falling back to the root package itself when the
   * consumer is a single, non-workspaces package (`location: ''`). This is what
   * lets link/unlink target a plain consumer, not only a monorepo.
   */
  loadConsumerWorkspaces(rootDir: string): WorkspaceInfo[] {
    const workspaces = this.loadWorkspaces(rootDir);
    if (workspaces.length > 0) {
      return workspaces;
    }
    const root = this.readPackageAsWorkspace(rootDir, rootDir);
    return root && root.name ? [root] : [];
  }

  /** Read a directory's package.json into a WorkspaceInfo, or null if absent/invalid. */
  private readPackageAsWorkspace(
    rootDir: string,
    dir: string,
  ): WorkspaceInfo | null {
    const pkgPath = path.join(dir, 'package.json');
    if (!this.fs.exists(pkgPath)) {
      return null;
    }
    try {
      const pkg = this.fs.readJson<{
        name?: string;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
        peerDependencies?: Record<string, string>;
        optionalDependencies?: Record<string, string>;
      }>(pkgPath);
      return {
        name: pkg.name ?? null,
        location: path.relative(rootDir, dir),
        path: dir,
        dependencies: pkg.dependencies ?? {},
        devDependencies: pkg.devDependencies ?? {},
        peerDependencies: pkg.peerDependencies ?? {},
        optionalDependencies: pkg.optionalDependencies ?? {},
      };
    } catch {
      return null;
    }
  }

  private getWorkspacePatterns(rootDir: string): string[] {
    const pkgPath = path.join(rootDir, 'package.json');
    if (!this.fs.exists(pkgPath)) {
      return [];
    }

    try {
      const pkg = this.fs.readJson<{
        workspaces?: string[] | { packages?: string[] };
      }>(pkgPath);

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
          .filter((entry) => !entry.startsWith('.') && entry !== 'node_modules')
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
