#!/usr/bin/env node

import { execSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type CliMode = 'link' | 'unlink' | 'register' | 'lint' | 'format';

type WorkspaceInfo = {
  name?: string;
  private?: boolean;
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

type CliOptions = {
  mode: CliMode;
  consumerRoot: string | null;
  uikitRoot: string;
  commandArgs: string[];
};

const OXLINT_VERSION = '1.62.0';
const OXFMT_VERSION = '0.47.0';

function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

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

function removeWorkspaceShadowInstall(
  consumerRoot: string,
  workspace: string,
  packageName: string,
): void {
  const packagePath = path.join(
    consumerRoot,
    workspace,
    'node_modules',
    packageName,
  );

  if (!existsSync(packagePath)) {
    return;
  }

  try {
    const stats = lstatSync(packagePath);
    if (stats.isSymbolicLink()) {
      return;
    }

    // Remove workspace-local regular install so Node resolves to linked root package.
    rmSync(packagePath, { recursive: true, force: true });
    console.log(
      `Removed shadow install at ${workspace}/node_modules/${packageName} to preserve local links.`,
    );
  } catch {
    // Best effort cleanup; linking may still succeed via root resolution.
  }
}

function ensureLinkedPath(
  consumerRoot: string,
  packageName: string,
  expectedTarget: string,
): void {
  const packagePath = path.join(consumerRoot, 'node_modules', packageName);

  try {
    const stats = lstatSync(packagePath);
    if (stats.isSymbolicLink() && realpathSync(packagePath) === expectedTarget) {
      return;
    }
    rmSync(packagePath, { recursive: true, force: true });
  } catch {
    // Path may not exist yet; continue and create symlink.
  }

  mkdirSync(path.dirname(packagePath), { recursive: true });
  symlinkSync(expectedTarget, packagePath, 'dir');
}

function clearWorkspaceViteCache(consumerRoot: string, workspace: string): void {
  const viteCachePath = path.join(consumerRoot, workspace, 'node_modules', '.vite');
  if (!existsSync(viteCachePath)) {
    return;
  }

  try {
    rmSync(viteCachePath, { recursive: true, force: true });
    console.log(`Cleared Vite cache at ${workspace}/node_modules/.vite.`);
  } catch {
    // Best-effort cache cleanup; linking still succeeds without this.
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

function findUIKitRoot(startDir: string): string | null {
  let current = startDir;

  while (true) {
    if (isValidUIKitRoot(current)) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function isValidUIKitRoot(rootDir: string): boolean {
  try {
    const pkgPath = path.join(rootDir, 'package.json');
    const pkg = readJson<{ workspaces?: unknown }>(pkgPath);
    if (!pkg.workspaces) {
      return false;
    }

    const workspaces = loadWorkspaces(rootDir);
    return workspaces.some(
      (ws) => ws.name === '@archon-research/design-system',
    );
  } catch {
    return false;
  }
}

function findUIKitRootFromConsumer(consumerRoot: string): string | null {
  const candidateNames = ['uikit'];
  let current = consumerRoot;

  while (true) {
    for (const candidateName of candidateNames) {
      const candidate = path.join(current, candidateName);
      if (isValidUIKitRoot(candidate)) {
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

function resolveUIKitRoot(
  explicitUIKitRoot: string | null,
  consumerRoot: string | null,
): string {
  if (explicitUIKitRoot) {
    const resolved = path.resolve(process.cwd(), explicitUIKitRoot);
    if (!isValidUIKitRoot(resolved)) {
      throw new Error(
        `Invalid uikit root: ${resolved}. Expected a workspace root containing @archon-research/design-system.`,
      );
    }
    return resolved;
  }

  const scriptRelativeRoot = path.resolve(scriptDir, '../../..');
  if (isValidUIKitRoot(scriptRelativeRoot)) {
    return scriptRelativeRoot;
  }

  if (consumerRoot) {
    const discovered = findUIKitRootFromConsumer(consumerRoot);
    if (discovered) {
      return discovered;
    }
  }

  const fromCwd = findUIKitRoot(process.cwd());
  if (fromCwd) {
    return fromCwd;
  }

  throw new Error(
    'Could not locate local uikit workspace automatically. Run from a consumer workspace near your uikit checkout, or pass --uikit-root / set UIKIT_ROOT.',
  );
}

function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);
  const command = args[0];
  let mode: CliMode;
  if (!command || command === 'link') {
    mode = 'link';
  } else if (command === 'unlink') {
    mode = 'unlink';
  } else if (command === 'register') {
    mode = 'register';
  } else if (command === 'lint') {
    mode = 'lint';
  } else if (command === 'format') {
    mode = 'format';
  } else {
    throw new Error(
      `Unknown command: ${command}. Expected one of: link, unlink, register, lint, format.`,
    );
  }

  const commandArgs = args.slice(1);

  let consumerRoot: string | null = null;
  let uikitRoot: string | null = process.env.UIKIT_ROOT ?? null;
  for (let i = 1; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--consumer-root' && args[i + 1]) {
      consumerRoot = path.resolve(process.cwd(), args[i + 1]);
      i += 1;
      continue;
    }
    if (arg === '--uikit-root' && args[i + 1]) {
      uikitRoot = args[i + 1];
      i += 1;
    }
  }

  if (
    mode !== 'register' &&
    mode !== 'lint' &&
    mode !== 'format' &&
    !consumerRoot
  ) {
    consumerRoot = findConsumerRoot(process.cwd());
  }

  if (mode === 'lint' || mode === 'format') {
    return {
      mode,
      consumerRoot: null,
      uikitRoot: '',
      commandArgs,
    };
  }

  return {
    mode,
    consumerRoot,
    uikitRoot: resolveUIKitRoot(uikitRoot, consumerRoot),
    commandArgs,
  };
}

function runLint(commandArgs: string[]): void {
  const forwarded = commandArgs.map(shellEscape).join(' ');
  run(
    `npm exec --yes --package oxlint@${OXLINT_VERSION} -- oxlint ${forwarded}`.trim(),
    process.cwd(),
  );
}

function hasConfigFlag(args: string[]): boolean {
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '-c' || arg === '--config' || arg.startsWith('--config=')) {
      return true;
    }
  }
  return false;
}

function runFormat(commandArgs: string[]): void {
  const args = [...commandArgs];
  const defaultConfig = './.oxfmtrc.ts';

  if (!hasConfigFlag(args) && existsSync(path.join(process.cwd(), '.oxfmtrc.ts'))) {
    args.unshift(defaultConfig);
    args.unshift('-c');
  }

  const forwarded = args.map(shellEscape).join(' ');
  run(
    `npm exec --yes --package oxfmt@${OXFMT_VERSION} -- oxfmt ${forwarded}`.trim(),
    process.cwd(),
  );
}

function registerLocalPackages(
  uikitRoot: string,
  supportedNames?: Set<string>,
): void {
  const uikitWorkspaces = loadWorkspaces(uikitRoot);
  const uikitPackages = uikitWorkspaces.filter(
    (ws) =>
      String(ws.name ?? '').startsWith('@archon-research/') &&
      !ws.private &&
      (!supportedNames || supportedNames.has(String(ws.name))),
  );

  if (uikitPackages.length === 0) {
    console.log('No public @archon-research packages found in this uikit workspace.');
    return;
  }

  for (const pkg of uikitPackages) {
    if (!pkg.name) {
      continue;
    }

    // Ensure CLI bin target exists before linking globally.
    if (
      pkg.name === '@archon-research/uikit-cli' &&
      !existsSync(path.join(pkg.path, 'dist', 'cli.js'))
    ) {
      run('npm run build', pkg.path);
    }

    run('npm link', pkg.path);
  }

  console.log('\nRegistered local uikit packages for downstream consumers.');
}

function linkCliIntoConsumer(consumerRoot: string): void {
  run(
    'npm link "@archon-research/uikit-cli" --package-lock=false --save=false',
    consumerRoot,
  );
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

  const allNames = new Set<string>();
  for (const names of neededByWorkspace.values()) {
    for (const name of names) {
      allNames.add(name);
    }
  }

  const rootPackageArgs = [...allNames].map((name) => `"${name}"`).join(' ');

  if (rootPackageArgs) {
    run(
      `npm link ${rootPackageArgs} --package-lock=false --save=false`,
      consumerRoot,
    );
  }

  // npm can materialize regular installs in some workspace setups; enforce root links.
  for (const name of allNames) {
    const target = dirByName.get(name);
    if (!target) {
      continue;
    }
    ensureLinkedPath(consumerRoot, name, target);
  }

  for (const [workspace, names] of neededByWorkspace.entries()) {
    const packageArgs = names.map((name) => `"${name}"`).join(' ');

    if (!packageArgs) {
      continue;
    }

    run(
      `npm link ${packageArgs} --workspace "${workspace}" --package-lock=false --save=false`,
      consumerRoot,
    );

    // npm --workspace link can leave a regular install in some workspace layouts.
    // Removing workspace shadow installs keeps resolution aligned to linked root packages.
    for (const name of names) {
      removeWorkspaceShadowInstall(consumerRoot, workspace, name);
    }

    clearWorkspaceViteCache(consumerRoot, workspace);
  }
}

function unlinkLocalPackages(
  consumerRoot: string,
  neededByWorkspace: Map<string, string[]>,
): void {
  if (neededByWorkspace.size === 0) {
    console.log('No local uikit packages referenced by this consumer workspaces.');
    return;
  }

  const allNames = new Set<string>();
  for (const names of neededByWorkspace.values()) {
    for (const name of names) {
      allNames.add(name);
    }
  }

  for (const name of allNames) {
    const ok = tryRun(
      `npm unlink "${name}" --package-lock=false --save=false`,
      consumerRoot,
    );
    if (!ok) {
      console.warn(`Unable to unlink ${name} at root; continuing.`);
    }
  }

  for (const [workspace, names] of neededByWorkspace.entries()) {
    const workspaceDir = path.join(consumerRoot, workspace);
    for (const name of names) {
      const ok = tryRun(
        `npm unlink "${name}" --workspace "${workspace}" --package-lock=false --save=false`,
        consumerRoot,
      );
      if (!ok) {
        console.warn(
          `Unable to unlink ${name} in ${workspace}; continuing with restore flow.`,
        );
      }

      // Fallback for cases where --workspace unlink does not clear workspace-local links.
      const fallbackOk = tryRun(
        `npm unlink "${name}" --package-lock=false --save=false`,
        workspaceDir,
        true,
      );
      if (!fallbackOk) {
        console.warn(
          `Unable to unlink ${name} directly in ${workspace}; continuing with restore flow.`,
        );
      }
    }

    clearWorkspaceViteCache(consumerRoot, workspace);
  }
}

function areRegistryPackagesReady(
  consumerRoot: string,
  neededByWorkspace: Map<string, string[]>,
): boolean {
  for (const [workspace, names] of neededByWorkspace.entries()) {
    for (const name of names) {
      const ok = tryRun(
        `npm_config_min_release_age=0 npm ls ${name} --depth=0 --workspace "${workspace}"`,
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

try {
  const { mode, consumerRoot, uikitRoot, commandArgs } = parseArgs(process.argv);

  if (mode === 'lint') {
    runLint(commandArgs);
    process.exit(0);
  }

  if (mode === 'format') {
    runFormat(commandArgs);
    process.exit(0);
  }

  if (mode === 'register') {
    registerLocalPackages(uikitRoot);
    process.exit(0);
  }

  if (!consumerRoot) {
    throw new Error('Consumer root is required for link/unlink operations.');
  }

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

  registerLocalPackages(uikitRoot, supportedNames);
  linkCliIntoConsumer(consumerRoot);

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

  let rootInstallOk = tryRun(
    'npm_config_min_release_age=0 npm install',
    consumerRoot,
  );

  let installOk = true;
  for (const workspace of neededByWorkspace.keys()) {
    installOk =
      tryRun(
        `npm_config_min_release_age=0 npm install --workspace "${workspace}"`,
        consumerRoot,
      ) &&
      installOk;
  }

  if (
    !rootInstallOk ||
    !installOk ||
    !areRegistryPackagesReady(consumerRoot, neededByWorkspace)
  ) {
    console.warn(
      '\nRegistry packages are not fully resolvable; falling back to local uikit linking.',
    );
    linkLocalPackages(consumerRoot, neededByWorkspace, dirByName);
  }

  // Keep consumer on the local CLI implementation so repeated link/unlink stays stable.
  linkCliIntoConsumer(consumerRoot);

  console.log('\nUnlinked local uikit packages and restored consumer dependencies.');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
}
