export type CommandMode = 'link' | 'unlink' | 'register' | 'lint' | 'format';

export type WorkspaceInfo = {
  name: string | null;
  location: string;
  path: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  optionalDependencies: Record<string, string>;
};

export type ParsedArgs = {
  mode: CommandMode;
  consumerRoot: string | null;
  uikitRoot: string;
  commandArgs: string[];
  verify: boolean;
  debug: boolean;
};

export type ValidationIssue = {
  type: SymlinkStatus;
  package: string;
  details: string;
};

export type ValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
};

export type SymlinkStatus = 'valid' | 'missing' | 'broken' | 'wrong-target';
