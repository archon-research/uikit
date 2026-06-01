import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(currentDir, '..');

const sourcesPath = join(packageRoot, 'sources.json');
const contentRoot = join(packageRoot, 'content');
const claudeOutputRoot = join(packageRoot, 'claude-plugin');
const copilotOutputRoot = join(packageRoot, 'copilot-plugin');

function sortById(items) {
  return [...items].sort((left, right) => left.id.localeCompare(right.id));
}

async function ensureFileEquals(leftPath, rightPath) {
  const [left, right] = await Promise.all([
    readFile(leftPath, 'utf8'),
    readFile(rightPath, 'utf8'),
  ]);

  if (left !== right) {
    throw new Error(`Drift detected between ${leftPath} and ${rightPath}`);
  }
}

async function main() {
  const raw = await readFile(sourcesPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.sources)) {
    throw new Error('sources.json must contain a "sources" array.');
  }

  const skills = sortById(
    parsed.sources.filter((entry) => entry.kind === 'skill'),
  );
  const agents = sortById(
    parsed.sources.filter((entry) => entry.kind === 'agent'),
  );

  for (const skill of skills) {
    await ensureFileEquals(
      join(contentRoot, 'skills', skill.id, 'SKILL.md'),
      join(claudeOutputRoot, 'skills', skill.id, 'SKILL.md'),
    );
    await ensureFileEquals(
      join(contentRoot, 'skills', skill.id, 'SKILL.md'),
      join(copilotOutputRoot, 'skills', skill.id, 'SKILL.md'),
    );
  }

  for (const agent of agents) {
    await ensureFileEquals(
      join(contentRoot, 'agents', `${agent.id}.md`),
      join(claudeOutputRoot, 'agents', `${agent.id}.md`),
    );
    await ensureFileEquals(
      join(contentRoot, 'agents', `${agent.id}.md`),
      join(copilotOutputRoot, 'agents', `${agent.id}.md`),
    );
  }
}

await main();
