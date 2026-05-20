import path from "node:path";
import type { CommandExecutor } from "../command-executor.js";
import type { FileSystemOps } from "../fs-utils.js";
import type { LinkValidator } from "../link-validator.js";
import type { Logger } from "../logger.js";
import type { PackageDiscovery } from "../package-discovery.js";
import type { WorkspaceInfo } from "../types.js";

/**
 * Link command - links uikit packages into consumer workspaces
 */
export class LinkCommand {
  private discovery: PackageDiscovery;
  private executor: CommandExecutor;
  private validator: LinkValidator;
  private fs: FileSystemOps;
  private logger: Logger;

  constructor(
    discovery: PackageDiscovery,
    executor: CommandExecutor,
    validator: LinkValidator,
    fs: FileSystemOps,
    logger: Logger,
  ) {
    this.discovery = discovery;
    this.executor = executor;
    this.validator = validator;
    this.fs = fs;
    this.logger = logger;
  }

  execute(consumerRoot: string, uikitRoot: string, verify: boolean = false): void {
    this.logger.debug("Starting link command", { consumerRoot, uikitRoot });

    const uikitWorkspaces = this.discovery.loadWorkspaces(uikitRoot);
    const consumerWorkspaces = this.discovery.loadWorkspaces(consumerRoot);

    const uikitPackages = uikitWorkspaces.filter((ws) =>
      String(ws.name ?? "").startsWith("@archon-research/"),
    );

    const dirByName = new Map(uikitPackages.map((pkg) => [pkg.name ?? "", pkg.path]));
    dirByName.delete("");

    const supportedNames = new Set(dirByName.keys());
    const neededByWorkspace = this.collectWorkspaceRequirements(consumerWorkspaces, supportedNames);

    if (neededByWorkspace.size === 0) {
      this.logger.info("No local uikit packages referenced by consumer workspaces.");
      return;
    }

    // Collect all packages that were actually linked
    const linkedNames = new Set<string>();
    for (const names of neededByWorkspace.values()) {
      for (const name of names) {
        linkedNames.add(name);
      }
    }

    this.linkPackages(consumerRoot, neededByWorkspace, dirByName);

    if (verify) {
      // Only verify packages that were actually linked
      const linkedDirByName = new Map<string, string>();
      for (const name of linkedNames) {
        const path = dirByName.get(name);
        if (path) {
          linkedDirByName.set(name, path);
        }
      }
      this.runVerification(consumerRoot, linkedDirByName);
    }
  }

  private collectWorkspaceRequirements(
    workspaces: WorkspaceInfo[],
    supportedNames: Set<string>,
  ): Map<string, string[]> {
    const neededByWorkspace = new Map<string, string[]>();

    for (const ws of workspaces) {
      const fields = [ws.dependencies];
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

  private linkPackages(
    consumerRoot: string,
    neededByWorkspace: Map<string, string[]>,
    dirByName: Map<string, string>,
  ): void {
    const allNames = new Set<string>();
    for (const names of neededByWorkspace.values()) {
      for (const name of names) {
        allNames.add(name);
      }
    }

    // Link at root level
    const rootPackageArgs = [...allNames].map((name) => `"${name}"`).join(" ");
    if (rootPackageArgs) {
      this.logger.info("Linking packages at root level...");
      this.executor.exec(`npm link ${rootPackageArgs} --package-lock=false --save=false`, {
        cwd: consumerRoot,
      });
    }

    // Ensure symlinks point to correct targets
    for (const name of allNames) {
      const target = dirByName.get(name);
      if (target) {
        this.ensureLinkedPath(consumerRoot, name, target);
      }
    }

    // Link per workspace
    for (const [workspace, names] of neededByWorkspace.entries()) {
      const packageArgs = names.map((name) => `"${name}"`).join(" ");
      if (!packageArgs) continue;

      this.logger.debug(`Linking packages for workspace: ${workspace}`);
      this.executor.exec(
        `npm link ${packageArgs} --workspace "${workspace}" --package-lock=false --save=false`,
        { cwd: consumerRoot },
      );

      // Clean up shadow installs and Vite cache
      for (const name of names) {
        this.removeWorkspaceShadowInstall(consumerRoot, workspace, name);
      }
      this.clearWorkspaceViteCache(consumerRoot, workspace);
    }

    this.logger.info("✓ Linked local uikit packages into consumer workspaces.");
  }

  private ensureLinkedPath(
    consumerRoot: string,
    packageName: string,
    expectedTarget: string,
  ): void {
    const packagePath = path.join(consumerRoot, "node_modules", packageName);

    try {
      if (this.fs.isSymlink(packagePath) && this.fs.realpath(packagePath) === expectedTarget) {
        return;
      }
      this.fs.removeDir(packagePath);
    } catch {
      // Path may not exist yet
    }

    this.fs.createDir(path.dirname(packagePath));
    this.fs.createSymlink(expectedTarget, packagePath);
  }

  private removeWorkspaceShadowInstall(
    consumerRoot: string,
    workspace: string,
    packageName: string,
  ): void {
    const packagePath = path.join(consumerRoot, workspace, "node_modules", packageName);

    if (!this.fs.exists(packagePath)) {
      return;
    }

    try {
      if (this.fs.isSymlink(packagePath)) {
        return;
      }

      this.fs.removeDir(packagePath);
      this.logger.info(
        `Removed shadow install at ${workspace}/node_modules/${packageName} to preserve local links.`,
      );
    } catch {
      // Best effort cleanup
    }
  }

  private clearWorkspaceViteCache(consumerRoot: string, workspace: string): void {
    const viteCachePath = path.join(consumerRoot, workspace, "node_modules", ".vite");

    if (!this.fs.exists(viteCachePath)) {
      return;
    }

    try {
      this.fs.removeDir(viteCachePath);
      this.logger.debug(`Cleared Vite cache at ${workspace}/node_modules/.vite`);
    } catch {
      // Best effort cleanup
    }
  }

  private runVerification(consumerRoot: string, dirByName: Map<string, string>): void {
    this.logger.info("\nVerifying link state...");
    const result = this.validator.validateLinkedPackages(consumerRoot, dirByName);

    if (result.valid) {
      this.logger.info("✓ All links valid");
    } else {
      this.logger.warn(`Found ${result.issues.length} issue(s):`);
      for (const issue of result.issues) {
        this.logger.warn(`  ${issue.type}: ${issue.package}`);
        this.logger.warn(`    ${issue.details}`);
      }
    }
  }
}
