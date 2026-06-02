import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generate } from './generate.ts';

const currentDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(currentDir, '..');
const sourcesPath = join(packageRoot, 'sources.json');
const lockPath = join(packageRoot, 'sources.lock.json');

const dryRun = process.argv.includes('--dry-run');

interface SourceEntry {
  id: string;
  kind: 'skill' | 'agent';
  sourceType: string;
  upstream: string;
  pinnedRevision: string;
}

interface LockEntry {
  id: string;
  kind: 'skill' | 'agent';
  sourceType: string;
  pinnedRevision: string;
  resolved: string;
}

function isSourceEntry(value: unknown): value is SourceEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    (candidate.kind === 'skill' || candidate.kind === 'agent') &&
    typeof candidate.sourceType === 'string' &&
    typeof candidate.upstream === 'string' &&
    typeof candidate.pinnedRevision === 'string'
  );
}

function toLockEntry(source: SourceEntry): LockEntry {
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

async function main() {
  const raw = await readFile(sourcesPath, 'utf8');
  const parsed = JSON.parse(raw) as { sources?: unknown };
  const sources =
    Array.isArray(parsed.sources) && parsed.sources.every(isSourceEntry)
      ? parsed.sources
      : [];
  const lock = {
    lockVersion: 1,
    sources: sources.map(toLockEntry),
  };

  if (dryRun) {
    process.stdout.write(`${JSON.stringify(lock, null, 2)}\n`);
    return;
  }

  await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
  await generate();
}

await main();
