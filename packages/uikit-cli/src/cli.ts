#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type LinkMode = 'link' | 'unlink';

type WorkspaceInfo = {
  name?: string;
  path: string;
  location: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

type RootPackageJson = {
  workspaces?: string[] | { packages?: string[] };
};

function run(command: string, cwd: string): void {
  console.log(`> (${cwd}) ${command}`);
  execSync(command, { stdio: 'inherit', cwd });
}

function tryRun(command: string, cwd: string, quiet = false): boolean {
  if (!quiet) {
    console.log(`> (${cwd}) ${command}`);
  }

  try {
    execSync(command, {
      stdio: quiet ? 'ignore' : 'inherit',
      cwd,
    });
    return true;
  } catch {
    return false;
  }
}

function readJson<T>(filePath: string): T {
  const content = readFileSync(filePath, 'utf8');
  return JSON.parse(content) as T;
}

function getWorkspacePatterns(rootDir: string): string[] {
  const pkg = readJson<RootPackageJson>(path.join(rootDir, 'package.json'));
  const workspaces = pkg.workspaces;
  if (Array.isArray(workspaces)) {
    return workspaces;
  }
  if (workspaces && Array.isArray(workspaces.packages)) {
    return workspaces.packages;
  }
  return [];
}

function resolveWorkspacePattern(rootDir: string, pattern: string): string[] {
  if (pattern.endsWith('/*')) {
    const base = pattern.slice(0, -2);
    const absBase = path.join(rootDir, base);
    return readdirSync(absBase, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(base, entry.name));
  }
  return [pattern];
}

function loadWorkspaces(rootDir: string): WorkspaceInfo[] {
  const patterns = getWorkspacePatterns(rootDir);
  const locations = patterns.flatMap((pattern) =>
    resolveWorkspacePattern(rootDir, pattern),
  );

  return locations
    .map((location) => {
      const pkgPath = path.join(rootDir, location, 'package.json');
      const pkg = readJson<WorkspaceInfo>(pkgPath);
      return {
        ...pkg,
        location,
        path: path.join(rootDir, location),
      };
    })
    .filter((ws) => Boolean(ws.name));
}

function findConsumerRoot(startDir: string): string {
  let current = startDir;
  while (true) {
    const pkgPath = path.join(current, 'package.json');
    try {
      const content = readFileSync(pkgPath, 'utf8');
      const pkg = JSON.parse(content) as { workspaces?: unknown };
      if (pkg.workspaces) {
        return current;
      }
    } catch {
      // File not found or parse error, continue up.
    }

    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(
        'Could not find consumer workspace root (no package.json with workspaces field)',
      );
    }
    current = parent;
  }
}

function parseArgs(argv: string[]): { mode: LinkMode; consumerRoot: string } {
  const args = argv.slice(2);
  const mode: LinkMode = args[0] === 'unlink' ? 'unlink' : 'link';

  let consumerRoot: string | null = null;
  for (let i = 1; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--consumer-root' && args[i + 1]) {
      consumerRoot = path.resolve(process.cwd(), args[i + 1]);
      i += 1;
    }
  }

  if (!consumerRoot) {
    consumerRoot = findConsumerRoot(process.cwd());
  }

  return { mode, consumerRoot };
}

function collectWorkspaceRequirements(
  workspaces: WorkspaceInfo[],
  supportedNames: Set<string>,
): Map<string, string[]> {
  const neededByWorkspace = new Map<string, string[]>();

  for (const ws of workspaces) {
    const fields: Record<string, string>[] = [
      ws.dependencies ?? {},
      ws.devDependencies ?? {},
      ws.optionalDependencies ?? {},
      ws.peerDependencies ?? {},
    ];

    const needed = new Set<string>();
    for (const depField of fields) {
      for (const depName of Object.keys(depField)) {
        if (supportedNames.has(depName)) {
          needed.add(depName);
        }
      }
    }

    if (needed.size > 0) {
      neededByWorkspace.set(ws.location, [...needed]);
    }
  }

  return neededByWorkspace;
}

function linkLocalPackages(
  consumerRoot: string,
  neededByWorkspace: Map<string, string[]>,
  dirByName: Map<string, string>,
): void {
  if (neededByWorkspace.size === 0) {
    console.log('No local uikit packages referenced by this consumer workspaces.');
    return;
  }

  const uniquePackageDirs = new Set<string>();
  for (const names of neededByWorkspace.values()) {
    for (const name of names) {
      const packageDir = dirByName.get(name);
      if (packageDir) {
        uniquePackageDirs.add(packageDir);
      }
    }
  }

  const packageArgs = [...uniquePackageDirs]
    .map((pkgDir) => `"${pkgDir}"`)
    .join(' ');
  const workspaceArgs = [...neededByWorkspace.keys()]
    .map((workspace) => `-w ${workspace}`)
    .join(' ');

  run(`npm link ${packageArgs} ${workspaceArgs}`, consumerRoot);
}

function unlinkLocalPackages(
  consumerRoot: string,
  neededByWorkspace: Map<string, string[]>,
): void {
  if (neededByWorkspace.size === 0) {
    console.log('No local uikit packages referenced by this consumer workspaces.');
    return;
  }

  for (const [workspace, names] of neededByWorkspace.entries()) {
    for (const name of names) {
      const ok = tryRun(`npm unlink "${name}" -w ${workspace}`, consumerRoot);
      if (!ok) {
        console.warn(
          `Unable to unlink ${name} in ${workspace}; continuing with restore flow.`,
        );
      }
    }
  }
}

function areRegistryPackagesReady(
  consumerRoot: string,
  neededByWorkspace: Map<string, string[]>,
): boolean {
  for (const [workspace, names] of neededByWorkspace.entries()) {
    for (const name of names) {
      const ok = tryRun(
        `npm ls ${name} -w ${workspace} --depth=0`,
        consumerRoot,
        true,
      );
      if (!ok) {
        return false;
      }
    }
  }

  return true;
}

function arePackagesPublished(
  consumerRoot: string,
  neededByWorkspace: Map<string, string[]>,
): boolean {
  const uniqueNames = new Set<string>();
  for (const names of neededByWorkspace.values()) {
    for (const name of names) {
      uniqueNames.add(name);
    }
  }

  for (const name of uniqueNames) {
    const ok = tryRun(`npm view ${name} version --json`, consumerRoot, true);
    if (!ok) {
      return false;
    }
  }

  return true;
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const uikitRoot = path.resolve(scriptDir, '../../..');

try {
  const { mode, consumerRoot } = parseArgs(process.argv);

  const uikitWorkspaces = loadWorkspaces(uikitRoot);
  const consumerWorkspaces = loadWorkspaces(consumerRoot);

  const uikitPackages = uikitWorkspaces.filter((ws) =>
    String(ws.name ?? '').startsWith('@archon-research/'),
  );

  const dirByName = new Map(uikitPackages.map((pkg) => [pkg.name ?? '', pkg.path]));
  dirByName.delete('');

  const supportedNames = new Set(dirByName.keys());
  const neededByWorkspace = collectWorkspaceRequirements(
    consumerWorkspaces,
    supportedNames,
  );

  if (mode === 'link') {
    linkLocalPackages(consumerRoot, neededByWorkspace, dirByName);
    console.log('\nLinked local uikit packages into consumer workspaces.');
    process.exit(0);
  }

  if (!arePackagesPublished(consumerRoot, neededByWorkspace)) {
    console.warn(
      '\nRegistry packages are not published yet; keeping local uikit links in place.',
    );
    linkLocalPackages(consumerRoot, neededByWorkspace, dirByName);
    console.log('\nConsumer remains on local uikit links.');
    process.exit(0);
  }

  unlinkLocalPackages(consumerRoot, neededByWorkspace);
  const installOk = tryRun('npm install', consumerRoot);

  if (!installOk || !areRegistryPackagesReady(consumerRoot, neededByWorkspace)) {
    console.warn(
      '\nRegistry packages are not fully resolvable; falling back to local uikit linking.',
    );
    linkLocalPackages(consumerRoot, neededByWorkspace, dirByName);
  }

  console.log('\nUnlinked local uikit packages and restored consumer dependencies.');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
}