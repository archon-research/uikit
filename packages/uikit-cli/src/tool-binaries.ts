import { createRequire } from 'node:module';
import path from 'node:path';

const requireFromCli = createRequire(import.meta.url);

/**
 * Resolve a CLI binary from uikit-cli dependencies so consumers
 * don't need tool packages installed in their own workspace.
 */
export function resolveCliBinary(
  packageName: string,
  binaryPath: string,
): string {
  try {
    const packageJsonPath = requireFromCli.resolve(
      `${packageName}/package.json`,
    );
    return path.join(path.dirname(packageJsonPath), binaryPath);
  } catch {
    throw new Error(
      `Could not resolve ${packageName} binary from @archon-research/uikit-cli dependencies.`,
    );
  }
}
