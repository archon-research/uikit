import { describe, expect, it } from 'vitest';

import type { FileSystemOps } from './fs-utils.js';
import { PackageDiscovery } from './package-discovery.js';

/** Fake filesystem exposing only exists/readJson, keyed by absolute path. */
function makeFs(pkgs: Record<string, object>): FileSystemOps {
  return {
    exists: (p: string) => Object.prototype.hasOwnProperty.call(pkgs, p),
    readJson: (p: string) => {
      if (!(p in pkgs)) throw new Error(`missing: ${p}`);
      return pkgs[p];
    },
    readFile: () => '',
    isDirectory: () => false,
    readDir: () => [],
    realpath: (p: string) => p,
    isSymlink: () => false,
    createSymlink: () => {},
    createDir: () => {},
    removeDir: () => {},
  } as unknown as FileSystemOps;
}

describe('PackageDiscovery.findConsumerRoot', () => {
  it('prefers a workspaces root (monorepo) walking up', () => {
    const d = new PackageDiscovery(
      makeFs({ '/repo/package.json': { workspaces: ['packages/*'] } }),
    );
    expect(d.findConsumerRoot('/repo/packages/ui')).toBe('/repo');
  });

  it('falls back to a single package that depends on uikit', () => {
    const d = new PackageDiscovery(
      makeFs({
        '/proj/package.json': {
          name: 'app',
          dependencies: { '@archon-research/design-system': '*' },
        },
      }),
    );
    expect(d.findConsumerRoot('/proj')).toBe('/proj');
  });

  it('finds the nearest uikit-consuming package from a nested dir', () => {
    const d = new PackageDiscovery(
      makeFs({
        '/proj/package.json': {
          name: 'app',
          devDependencies: { '@archon-research/charting': '*' },
        },
      }),
    );
    expect(d.findConsumerRoot('/proj/src/components')).toBe('/proj');
  });

  it('throws when there is neither a workspaces root nor a uikit consumer', () => {
    const d = new PackageDiscovery(
      makeFs({ '/x/package.json': { name: 'x' } }),
    );
    expect(() => d.findConsumerRoot('/x')).toThrow(/consumer root/i);
  });
});

describe('PackageDiscovery.loadConsumerWorkspaces', () => {
  it('returns the root package itself for a single-package consumer', () => {
    const d = new PackageDiscovery(
      makeFs({
        '/proj/package.json': {
          name: 'app',
          dependencies: { '@archon-research/design-system': '*' },
        },
      }),
    );
    const ws = d.loadConsumerWorkspaces('/proj');
    expect(ws).toHaveLength(1);
    expect(ws[0]).toMatchObject({ name: 'app', location: '' });
  });
});
