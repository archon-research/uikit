import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
} from "node:fs";

/**
 * File system operations interface for dependency injection and testing
 */
export interface FileSystemOps {
  exists(path: string): boolean;
  readFile(path: string): string;
  readJson<T>(path: string): T;
  realpath(path: string): string;
  isSymlink(path: string): boolean;
  removeDir(path: string, options?: { recursive?: boolean; force?: boolean }): void;
  createSymlink(target: string, path: string): void;
  createDir(path: string, options?: { recursive?: boolean }): void;
  readDir(path: string): string[];
  isDirectory(path: string): boolean;
}

/**
 * Real file system implementation
 */
export class RealFileSystem implements FileSystemOps {
  exists(path: string): boolean {
    return existsSync(path);
  }

  readFile(path: string): string {
    return readFileSync(path, "utf8");
  }

  readJson<T>(path: string): T {
    try {
      if (process.env.UIKIT_DEBUG) {
        console.log("[DEBUG readJson]", path);
      }
      const content = this.readFile(path);
      return JSON.parse(content) as T;
    } catch (error) {
      console.error("[readJson ERROR] Failed to read:", path);
      throw error;
    }
  }

  realpath(path: string): string {
    return realpathSync(path);
  }

  isSymlink(path: string): boolean {
    try {
      return lstatSync(path).isSymbolicLink();
    } catch {
      return false;
    }
  }

  removeDir(path: string, options?: { recursive?: boolean; force?: boolean }): void {
    rmSync(path, { recursive: true, force: true, ...options });
  }

  createSymlink(target: string, path: string): void {
    symlinkSync(target, path, "dir");
  }

  createDir(path: string, options?: { recursive?: boolean }): void {
    mkdirSync(path, { recursive: true, ...options });
  }

  readDir(path: string): string[] {
    return readdirSync(path);
  }

  isDirectory(path: string): boolean {
    try {
      return statSync(path).isDirectory();
    } catch {
      return false;
    }
  }
}
