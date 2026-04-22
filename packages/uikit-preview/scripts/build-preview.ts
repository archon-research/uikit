import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(scriptDir, '..');
const distDir = resolve(packageDir, 'dist');

const run = (command: string, args: string[]) => {
  execFileSync(command, args, {
    cwd: packageDir,
    env: process.env,
    stdio: 'inherit',
  });
};

rmSync(distDir, { force: true, recursive: true });
mkdirSync(distDir, { recursive: true });

run('npm', [
  'exec',
  '--',
  'panda',
  'studio',
  '--build',
  '--config',
  'panda.config.ts',
  '--outdir',
  'dist/studio',
]);

run('npm', [
  'exec',
  '--',
  'ladle',
  'build',
  '--outDir',
  'dist/stories',
  '--base',
  './',
]);

cpSync(resolve(packageDir, 'static'), distDir, { recursive: true });
writeFileSync(resolve(distDir, '.nojekyll'), '');
