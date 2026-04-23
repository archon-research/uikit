import { execFileSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { resolve, dirname } from 'node:path';
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

run('npm', ['run', 'generate']);

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
cpSync(resolve(packageDir, 'styled-system', 'styles.css'), resolve(distDir, 'design-system.css'));
writeFileSync(resolve(distDir, '.nojekyll'), '');
