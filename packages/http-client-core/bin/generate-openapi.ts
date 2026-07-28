#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
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

// openapi-typescript builds its output with the classic TypeScript compiler API, which
// TypeScript 7.0 does not ship (openapi-ts/openapi-typescript#2841). Running from an empty
// directory makes npx resolve it in an isolated tree alongside a TypeScript that still has that
// API, instead of picking up the host project's compiler.
const isolatedCwd = mkdtempSync(path.join(os.tmpdir(), 'openapi-typescript-'));

try {
  execSync(
    `npx --yes --package=openapi-typescript@7 --package=typescript@5 openapi-typescript "${absoluteSchema}" --output "${absoluteOutput}"`,
    { cwd: isolatedCwd, stdio: 'inherit' },
  );
} finally {
  rmSync(isolatedCwd, { force: true, recursive: true });
}

console.log(`Generated: ${absoluteOutput}`);
