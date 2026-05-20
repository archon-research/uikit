import path from "node:path";
import type { CommandExecutor } from "../command-executor.js";
import type { FileSystemOps } from "../fs-utils.js";
import { shellEscape } from "../shell-utils.js";

/**
 * Format command - forwards to oxfmt with config detection
 */
export class FormatCommand {
  private executor: CommandExecutor;
  private fs: FileSystemOps;

  constructor(executor: CommandExecutor, fs: FileSystemOps) {
    this.executor = executor;
    this.fs = fs;
  }

  execute(args: string[]): void {
    const modifiedArgs = [...args];
    const defaultConfig = "./.oxfmtrc.ts";

    // Add default config if not specified and file exists
    if (!this.hasConfigFlag(modifiedArgs)) {
      const configPath = path.join(process.cwd(), ".oxfmtrc.ts");
      if (this.fs.exists(configPath)) {
        modifiedArgs.unshift(defaultConfig);
        modifiedArgs.unshift("-c");
      }
    }

    const escapedArgs = modifiedArgs.map((arg) => shellEscape(arg)).join(" ");
    this.executor.exec(`npm exec -- oxfmt ${escapedArgs}`.trim(), { cwd: process.cwd() });
  }

  private hasConfigFlag(args: string[]): boolean {
    for (let i = 0; i < args.length; i += 1) {
      const arg = args[i];
      if (arg === "-c" || arg === "--config" || arg.startsWith("--config=")) {
        return true;
      }
    }
    return false;
  }
}
