import { execSync } from 'node:child_process';

export type ExecOptions = {
  cwd?: string;
  silent?: boolean;
};

export type ExecResult = {
  stdout: string;
  stderr: string;
  success: boolean;
};

/**
 * Command executor interface for dependency injection and testing
 */
export interface CommandExecutor {
  exec(command: string, options?: ExecOptions): ExecResult;
  execQuiet(command: string, options?: ExecOptions): boolean;
}

/**
 * Real npm command executor using execSync
 */
export class NpmCommandExecutor implements CommandExecutor {
  private debugMode: boolean;

  constructor(debugMode: boolean = false) {
    this.debugMode = debugMode;
  }

  exec(command: string, options?: ExecOptions): ExecResult {
    const { cwd = process.cwd(), silent = false } = options || {};

    if (this.debugMode) {
      console.log(`[DEBUG] Executing: ${command}`);
      console.log(`[DEBUG] CWD: ${cwd}`);
    }

    try {
      const stdout = execSync(command, {
        cwd,
        encoding: 'utf8',
        stdio: silent ? 'pipe' : 'inherit',
      });

      return {
        stdout: typeof stdout === 'string' ? stdout : '',
        stderr: '',
        success: true,
      };
    } catch (error) {
      const err = error as {
        stdout?: Buffer;
        stderr?: Buffer;
        message?: string;
      };
      return {
        stdout: err.stdout?.toString('utf8') || '',
        stderr: err.stderr?.toString('utf8') || err.message || 'Unknown error',
        success: false,
      };
    }
  }

  execQuiet(command: string, options?: ExecOptions): boolean {
    const result = this.exec(command, { ...options, silent: true });
    return result.success;
  }
}
