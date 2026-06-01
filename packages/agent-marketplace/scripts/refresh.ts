import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generate } from './generate.ts';
import { resolveSemanticVersion } from './versioning.ts';

const currentDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(currentDir, '..');
const sourcesPath = join(packageRoot, 'sources.json');
const lockPath = join(packageRoot, 'sources.lock.json');

const dryRun = process.argv.includes('--dry-run');

function toLockEntry(source) {
  const resolved =
    source.kind === 'agent'
      ? `packages/agent-marketplace/content/agents/${source.id}.md`
      : source.sourceType === 'local-authored'
        ? `packages/agent-marketplace/content/skills/${source.id}/SKILL.md`
        : source.upstream;

  return {
    id: source.id,
    kind: source.kind,
    sourceType: source.sourceType,
    pinnedRevision: source.pinnedRevision,
    resolved,
  };
}

async function runGenerate() {
  const pluginVersion = await resolveCurrentVersion();

  await generate({ version: pluginVersion });
}

async function resolveCurrentVersion() {
  return resolveSemanticVersion();
}

async function main() {
  const raw = await readFile(sourcesPath, 'utf8');
  const parsed = JSON.parse(raw);
  const sources = Array.isArray(parsed.sources) ? parsed.sources : [];
  const lock = {
    lockVersion: 1,
    sources: sources.map(toLockEntry),
  };

  if (dryRun) {
    process.stdout.write(`${JSON.stringify(lock, null, 2)}\n`);
    return;
  }

  await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
  await runGenerate();
}

await main();
