import { execFileSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(scriptDir, '..');
const distDir = resolve(packageDir, 'dist');
const studioDir = resolve(distDir, 'studio');

const run = (command: string, args: string[]) => {
  execFileSync(command, args, {
    cwd: packageDir,
    env: process.env,
    stdio: 'inherit',
  });
};

const visitFiles = (dirPath: string, visitor: (filePath: string) => void) => {
  for (const entry of readdirSync(dirPath)) {
    const entryPath = resolve(dirPath, entry);
    const stats = statSync(entryPath);

    if (stats.isDirectory()) {
      visitFiles(entryPath, visitor);
      continue;
    }

    visitor(entryPath);
  }
};

const rewriteStudioAssetPaths = () => {
  visitFiles(studioDir, (filePath) => {
    if (!filePath.endsWith('.html')) {
      return;
    }

    const prefix = relative(dirname(filePath), studioDir) || '.';
    const content = readFileSync(filePath, 'utf8');
    const rewritten = content
      .replaceAll('href="/', `href="${prefix}/`)
      .replaceAll("href='/", `href='${prefix}/`)
      .replaceAll('src="/', `src="${prefix}/`)
      .replaceAll("src='/", `src='${prefix}/`)
      .replaceAll('component-url="/', `component-url="${prefix}/`)
      .replaceAll('renderer-url="/', `renderer-url="${prefix}/`)
      .replaceAll('before-hydration-url="/', `before-hydration-url="${prefix}/`)
      .replaceAll('url(/', `url(${prefix}/`);

    writeFileSync(filePath, rewritten);
  });
};

rmSync(distDir, { force: true, recursive: true });
mkdirSync(distDir, { recursive: true });

run('npm', ['run', 'generate']);

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

rewriteStudioAssetPaths();

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
