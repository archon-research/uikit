#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

function parseArg(name: string, fallback?: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) {
    return inline.slice(prefix.length);
  }

  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0 && process.argv[idx + 1]) {
    return process.argv[idx + 1];
  }

  return fallback;
}

const schema = parseArg('schema', process.env.OPENAPI_FILE);
const output = parseArg('output', 'generated/openapi-types.ts') ?? 'generated/openapi-types.ts';

if (!schema) {
  console.error('Missing schema path. Use --schema <path-to-openapi-json>.');
  process.exit(1);
}

const absoluteSchema = path.resolve(process.cwd(), schema);
const absoluteOutput = path.resolve(process.cwd(), output);

if (!existsSync(absoluteSchema)) {
  console.error(`OpenAPI schema file does not exist: ${absoluteSchema}`);
  process.exit(1);
}

mkdirSync(path.dirname(absoluteOutput), { recursive: true });
execSync(`npx openapi-typescript "${absoluteSchema}" --output "${absoluteOutput}"`, {
  stdio: 'inherit',
});

console.log(`Generated: ${absoluteOutput}`);
