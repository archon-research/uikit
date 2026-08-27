#!/usr/bin/env node
// Fail if the snapshot directory holds PNGs for stories that no longer exist.
//
// Orphans accumulate when a story is removed or renamed but its committed
// baseline PNG is left behind (a rename shows up as a new story file, never as
// a change to the stale PNG, so the visual-snapshots job never re-checks it).
// This is a cheap, render-free gate: it parses story metadata via Ladle's
// `getMeta` (no build, no browser) and compares it against the PNGs on disk.

import { readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import getMeta from '@ladle/react/meta';

const SNAPSHOT_DIR = 'tests/snapshot.spec.ts-snapshots';
const SUFFIX = '-chromium-darwin.png';

const meta = await getMeta();
const storyIds = new Set(Object.keys(meta.stories));

const dir = path.join(process.cwd(), SNAPSHOT_DIR);
const orphans = readdirSync(dir)
  .filter((file) => file.endsWith(SUFFIX))
  .filter((file) => !storyIds.has(file.slice(0, -SUFFIX.length)))
  .sort();

if (orphans.length > 0) {
  console.error(
    `Found ${orphans.length} orphaned snapshot(s) — a PNG exists but its story does not.\n` +
      `Delete these (the stories were removed or renamed):\n`,
  );
  for (const orphan of orphans) console.error(`  ${SNAPSHOT_DIR}/${orphan}`);
  process.exit(1);
}

console.log(`No orphaned snapshots (${storyIds.size} stories checked).`);
