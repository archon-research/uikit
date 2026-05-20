import type { CommandExecutor } from "../command-executor.js";
import type { Logger } from "../logger.js";
import type { PackageDiscovery } from "../package-discovery.js";

/**
 * Register command - globally links uikit packages via npm link
 */
export class RegisterCommand {
  private discovery: PackageDiscovery;
  private executor: CommandExecutor;
  private logger: Logger;

  constructor(discovery: PackageDiscovery, executor: CommandExecutor, logger: Logger) {
    this.discovery = discovery;
    this.executor = executor;
    this.logger = logger;
  }

  execute(uikitRoot: string, supportedNames?: Set<string>): void {
    this.logger.debug("Starting register command", { uikitRoot });

    const uikitWorkspaces = this.discovery.loadWorkspaces(uikitRoot);
    const uikitPackages = uikitWorkspaces.filter((ws) =>
      String(ws.name ?? "").startsWith("@archon-research/"),
    );

    const packagesToRegister = supportedNames
      ? uikitPackages.filter((pkg) => supportedNames.has(pkg.name ?? ""))
      : uikitPackages;

    this.logger.info(`Registering ${packagesToRegister.length} local uikit packages...`);

    for (const pkg of packagesToRegister) {
      if (!pkg.name) continue;

      this.logger.debug(`Registering ${pkg.name}`, { path: pkg.path });

      const result = this.executor.exec(`npm link`, { cwd: pkg.path });

      if (!result.success) {
        this.logger.error(`Failed to register ${pkg.name}`, {
          error: result.stderr,
        });
        throw new Error(`Failed to register ${pkg.name}`);
      }
    }

    this.logger.info("✓ All packages registered successfully");
  }
}
