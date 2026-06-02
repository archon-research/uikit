import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(currentDir, '..');
const repoRoot = resolve(packageRoot, '..', '..');

function runGit(args: string[]): string | undefined {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return undefined;
  }
}

export function resolveSemanticVersion(explicitVersion?: string): string {
  if (explicitVersion) {
    return explicitVersion;
  }

  const envVersion =
    process.env.UIKIT_PLUGIN_SEMVER ??
    process.env.NEXT_RELEASE_VERSION ??
    process.env.RELEASE_VERSION;
  if (envVersion) {
    return envVersion;
  }

  throw new Error(
    'Unable to resolve semantic version. Set UIKIT_PLUGIN_SEMVER (or NEXT_RELEASE_VERSION / RELEASE_VERSION).',
  );
}

function isMainBranch(): boolean {
  if (process.env.GITHUB_REF === 'refs/heads/main') {
    return true;
  }

  const branchName =
    process.env.GITHUB_REF_NAME ??
    runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
  return branchName === 'main';
}

export function resolvePluginVersion(explicitVersion?: string): string {
  const semanticVersion = resolveSemanticVersion(explicitVersion);
  if (semanticVersion.includes('+')) {
    return semanticVersion;
  }

  if (isMainBranch()) {
    return semanticVersion;
  }

  const commitHash = runGit(['rev-parse', '--short=12', 'HEAD']) ?? 'unknown';
  return `${semanticVersion}+${commitHash}`;
}
