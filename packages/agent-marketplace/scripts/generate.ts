import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolvePluginVersion } from './versioning.ts';

const currentDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(currentDir, '..');
const repoRoot = resolve(packageRoot, '..', '..');

const sourcesPath = join(packageRoot, 'sources.json');
const contentRoot = join(packageRoot, 'content');
const claudeOutputRoot = join(packageRoot, 'claude-plugin');
const copilotOutputRoot = join(packageRoot, 'copilot-plugin');

const claudeMarketplacePath = join(
  repoRoot,
  '.claude-plugin',
  'marketplace.json',
);
const copilotMarketplacePath = join(
  repoRoot,
  '.github',
  'plugin',
  'marketplace.json',
);

const pluginId = 'uikit-agent-marketplace';
const currentFilePath = fileURLToPath(import.meta.url);

type PluginTarget = 'claude-code' | 'copilot-cli';

interface SourceEntry {
  id: string;
  kind: 'skill' | 'agent';
  sourceType: string;
  upstream: string;
  pinnedRevision: string;
}

type SkillEntry = SourceEntry & { kind: 'skill' };
type AgentEntry = SourceEntry & { kind: 'agent' };

interface SourcesFile {
  sources: SourceEntry[];
}

interface CopilotPluginManifest {
  schemaVersion: 1;
  id: string;
  name: string;
  version: string;
  description: string;
  target: PluginTarget;
  skills: Array<{ id: string; path: string }>;
  agents: Array<{ id: string; path: string }>;
}

interface ClaudePluginManifest {
  name: string;
  version: string;
  description: string;
  author: { name: string };
  lspServers: {
    oxlint: {
      command: string;
      args: string[];
      extensionToLanguage: Record<string, string>;
    };
  };
}

function sortById<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => left.id.localeCompare(right.id));
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

async function readSources(): Promise<{
  skills: SkillEntry[];
  agents: AgentEntry[];
}> {
  const raw = await readFile(sourcesPath, 'utf8');
  const parsed = JSON.parse(raw) as Partial<SourcesFile>;
  if (!Array.isArray(parsed.sources)) {
    throw new Error('sources.json must contain a "sources" array.');
  }

  if (!parsed.sources.every(isSourceEntry)) {
    throw new Error(
      'sources.json contains one or more invalid source entries.',
    );
  }

  const skills = parsed.sources.filter(
    (entry): entry is SkillEntry => entry.kind === 'skill',
  );
  const agents = parsed.sources.filter(
    (entry): entry is AgentEntry => entry.kind === 'agent',
  );
  return { skills: sortById(skills), agents: sortById(agents) };
}

async function ensureExists(filePath: string, message: string): Promise<void> {
  try {
    await readFile(filePath, 'utf8');
  } catch {
    throw new Error(`${message}: ${filePath}`);
  }
}

async function copySkill(outputRoot: string, skillId: string): Promise<void> {
  const sourceDir = join(contentRoot, 'skills', skillId);
  const sourceSkillFile = join(sourceDir, 'SKILL.md');
  const destinationDir = join(outputRoot, 'skills', skillId);

  await ensureExists(sourceSkillFile, 'Missing normalized skill');
  await mkdir(destinationDir, { recursive: true });
  await cp(sourceDir, destinationDir, { recursive: true });
}

async function copyAgent(outputRoot: string, agentId: string): Promise<void> {
  const sourceFile = join(contentRoot, 'agents', `${agentId}.md`);
  const destinationDir = join(outputRoot, 'agents');
  const destinationFile = join(destinationDir, `${agentId}.md`);

  await ensureExists(sourceFile, 'Missing normalized agent');
  await mkdir(destinationDir, { recursive: true });
  await cp(sourceFile, destinationFile);
}

function buildCopilotPluginManifest(
  target: PluginTarget,
  skills: SkillEntry[],
  agents: AgentEntry[],
  version: string,
): CopilotPluginManifest {
  return {
    schemaVersion: 1,
    id: pluginId,
    name: 'UIKit Agent Marketplace',
    version,
    description:
      'Reusable UI-focused skills and specialist agents for Claude Code and GitHub Copilot CLI.',
    target,
    skills: skills.map((skill) => ({
      id: skill.id,
      path: `skills/${skill.id}/SKILL.md`,
    })),
    agents: agents.map((agent) => ({
      id: agent.id,
      path: `agents/${agent.id}.md`,
    })),
  };
}

function buildClaudePluginManifest(version: string): ClaudePluginManifest {
  return {
    name: pluginId,
    version,
    description:
      'Reusable UI-focused skills and specialist agents for Claude Code.',
    author: {
      name: 'Archon Research',
    },
    lspServers: {
      oxlint: {
        command: 'oxlint',
        args: ['--lsp'],
        extensionToLanguage: {
          '.ts': 'typescript',
          '.tsx': 'typescriptreact',
          '.js': 'javascript',
          '.jsx': 'javascriptreact',
          '.mjs': 'javascript',
          '.cjs': 'javascript',
        },
      },
    },
  };
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function writePluginOutput(
  target: PluginTarget,
  outputRoot: string,
  skills: SkillEntry[],
  agents: AgentEntry[],
  version: string,
): Promise<void> {
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });

  for (const skill of skills) {
    await copySkill(outputRoot, skill.id);
  }

  for (const agent of agents) {
    await copyAgent(outputRoot, agent.id);
  }

  if (target === 'claude-code') {
    const manifest = buildClaudePluginManifest(version);
    await writeJson(
      join(outputRoot, '.claude-plugin', 'plugin.json'),
      manifest,
    );
    return;
  }
  const manifest = buildCopilotPluginManifest(target, skills, agents, version);
  await writeJson(join(outputRoot, 'plugin.json'), manifest);
}

async function writeMarketplaceManifests(version: string): Promise<void> {
  await writeJson(claudeMarketplacePath, {
    name: 'uikit-plugins',
    owner: {
      name: 'Archon Research',
    },
    description:
      'UIKit marketplace for shared UI skills and specialist agents.',
    plugins: [
      {
        name: pluginId,
        version,
        description: 'UI skills and specialist agents for code assistants.',
        source: './packages/agent-marketplace/claude-plugin',
      },
    ],
  });

  await writeJson(copilotMarketplacePath, {
    schemaVersion: 1,
    plugins: [
      {
        id: pluginId,
        name: 'UIKit Agent Marketplace',
        version,
        description: 'UI skills and specialist agents for code assistants.',
        source: './packages/agent-marketplace/copilot-plugin',
      },
    ],
  });
}

export async function generate(options: { version?: string } = {}) {
  const { skills, agents } = await readSources();
  const pluginVersion = resolvePluginVersion(options.version);
  await writePluginOutput(
    'claude-code',
    claudeOutputRoot,
    skills,
    agents,
    pluginVersion,
  );
  await writePluginOutput(
    'copilot-cli',
    copilotOutputRoot,
    skills,
    agents,
    pluginVersion,
  );
  await writeMarketplaceManifests(pluginVersion);
}

if (process.argv[1] === currentFilePath) {
  await generate();
}
