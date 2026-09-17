import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build, type Rolldown } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import codeSplitting, {
  type CodeSplittingGroup,
  DEFAULT_GROUPS,
  GROUP_PRIORITIES,
} from './dist/code-splitting.js';

/**
 * A chunk-group config that groups nothing is indistinguishable from one that
 * works, at every level short of the output: it type-checks, the build exits 0,
 * and the only difference is which module ended up in which file. So every
 * assertion here reads the chunk graph of a real `vite build` over a fixture
 * app, and the two claims worth making — that the groups fire at all, and that
 * `entriesAware` changes what the entry pulls down — are each made against the
 * same build run both ways.
 *
 * `dist` is what a consumer resolves through `exports`, so that is what runs.
 */

const fixtureRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures/code-splitting',
);

const tempRoots: string[] = [];

afterAll(() => {
  for (const root of tempRoots)
    fs.rmSync(root, { recursive: true, force: true });
});

/**
 * The fixture app, materialised outside the repo.
 *
 * `vendor/` is copied in as `node_modules/`, since a directory of that name
 * cannot be committed — and the module ids the groups match on have to be the
 * ones a real install produces.
 */
function fixtureApp(): { base: string; root: string } {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'vite-config-'));
  tempRoots.push(base);
  const root = path.join(base, 'app');
  fs.mkdirSync(root, { recursive: true });

  for (const entry of fs.readdirSync(fixtureRoot))
    fs.cpSync(
      path.join(fixtureRoot, entry),
      path.join(root, entry === 'vendor' ? 'node_modules' : entry),
      { recursive: true },
    );
  fs.writeFileSync(path.join(root, 'package.json'), '{"type":"module"}\n');

  return { base, root };
}

/**
 * The same app with the design system linked in from outside `node_modules`,
 * the way a workspace or `npm link` provides it.
 */
function linkedFixtureApp(): { base: string; root: string } {
  const { base, root } = fixtureApp();
  const installed = path.join(
    root,
    'node_modules/@archon-research/design-system',
  );
  const linked = path.join(base, 'packages/design-system');

  fs.mkdirSync(path.dirname(linked), { recursive: true });
  fs.renameSync(installed, linked);
  fs.symlinkSync(linked, installed, 'junction');
  // Resolution runs from the link target's real path, which is outside the app.
  fs.symlinkSync(
    path.join(root, 'node_modules'),
    path.join(base, 'node_modules'),
    'junction',
  );

  return { base, root };
}

type Chunk = Rolldown.OutputChunk;

/** Every chunk of a production build of the fixture app. */
async function buildApp(
  groups: CodeSplittingGroup[] | undefined,
  app: { root: string } = sharedApp,
): Promise<Chunk[]> {
  const output = await build({
    root: app.root,
    configFile: false,
    logLevel: 'silent',
    build: {
      write: false,
      minify: false,
      target: 'esnext',
      rolldownOptions: {
        input: { app: path.join(app.root, 'entry.js') },
        output: groups === undefined ? {} : { codeSplitting: { groups } },
      },
    },
  });

  const results = (
    Array.isArray(output) ? output : [output]
  ) as Rolldown.RolldownOutput[];
  return results
    .flatMap((result) => result.output)
    .filter((item): item is Chunk => item.type === 'chunk');
}

/** The chunk holding `suffix`, by the tail of a module id. */
function chunkOf(chunks: Chunk[], suffix: string): Chunk {
  const held = chunks.filter((chunk) =>
    chunk.moduleIds.some((id) => id.replaceAll('\\', '/').endsWith(suffix)),
  );
  expect(
    held.map((chunk) => chunk.name),
    `no chunk holds ${suffix}`,
  ).toHaveLength(1);
  return held[0]!;
}

/**
 * Every module the browser has to fetch before a single dynamic import
 * resolves: the entry chunk plus its static imports, transitively.
 *
 * This, not the chunk names, is what `entriesAware` moves. A build can name its
 * chunks exactly right and still have the entry statically importing the one
 * that holds the lazy-only code.
 */
function entryStaticGraph(chunks: Chunk[]): string[] {
  const byFileName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]));
  const pending = chunks
    .filter((chunk) => chunk.isEntry)
    .map((c) => c.fileName);
  const seen = new Set<string>();
  const modules: string[] = [];

  while (pending.length > 0) {
    const fileName = pending.pop()!;
    if (seen.has(fileName)) continue;
    seen.add(fileName);

    const chunk = byFileName.get(fileName);
    if (chunk === undefined) continue;
    modules.push(...chunk.moduleIds.map((id) => id.replaceAll('\\', '/')));
    pending.push(...chunk.imports);
  }
  return modules;
}

function reaches(chunks: Chunk[], suffix: string): boolean {
  return entryStaticGraph(chunks).some((id) => id.endsWith(suffix));
}

const DESIGN_SYSTEM_ROOT = '@archon-research/design-system/dist/index.js';
const DRAWER = '@archon-research/design-system/dist/components/Drawer.js';
const ARK = '@ark-ui/react/dist/index.js';
const XYCHART = '@archon-research/charting/dist/xychart.js';
const PRIMITIVES = '@archon-research/charting/dist/primitives.js';
const VISX_XYCHART = '@visx/xychart/dist/index.js';
const VISX_SHAPE = '@visx/shape/dist/index.js';
const REACT = 'node_modules/react/index.js';

let sharedApp: { base: string; root: string };

beforeAll(() => {
  sharedApp = fixtureApp();
});

describe('code-splitting preset', () => {
  it('emits the groups it ships and nothing it does not', async () => {
    const chunks = await buildApp(codeSplitting().groups);

    // Grouped, and grouped where the preset says: the assertion is on which
    // chunk holds which module, not on a chunk existing under the right name.
    expect(chunkOf(chunks, REACT).name).toBe('react');
    expect(chunkOf(chunks, DESIGN_SYSTEM_ROOT).name).toMatch(/^design-system/);
    expect(chunkOf(chunks, XYCHART).name).toMatch(/^charting/);

    // The baseline the assertions above are measured against. Without the
    // groups nothing is named, so a group that silently matched nothing would
    // fail every line here rather than quietly agreeing with the default.
    const ungrouped = await buildApp(undefined);
    for (const module of [REACT, DESIGN_SYSTEM_ROOT, XYCHART])
      expect(chunkOf(ungrouped, module).name).not.toMatch(
        /^(react|design-system|charting)/,
      );
  });

  it('keeps lazy-only design-system code out of the entry, and only with entriesAware', async () => {
    // The consumer-reported failure, reproduced and then fixed. Flat, the one
    // design chunk holds both the shared root and the drawer, and the entry
    // imports it for the root — so the drawer, and the Ark UI code it pulls in,
    // ship in the entry's static graph.
    const flat = await buildApp(
      DEFAULT_GROUPS.map((group) => ({ ...group, entriesAware: false })),
    );
    expect(reaches(flat, DESIGN_SYSTEM_ROOT)).toBe(true);
    expect(reaches(flat, DRAWER)).toBe(true);
    expect(reaches(flat, ARK)).toBe(true);
    expect(chunkOf(flat, DRAWER).fileName).toBe(
      chunkOf(flat, DESIGN_SYSTEM_ROOT).fileName,
    );

    // As shipped: the group splits by which entries reach it. The entry keeps
    // the root, the drawer route keeps the drawer.
    const aware = await buildApp(codeSplitting().groups);
    expect(reaches(aware, DESIGN_SYSTEM_ROOT)).toBe(true);
    expect(reaches(aware, DRAWER)).toBe(false);
    expect(reaches(aware, ARK)).toBe(false);
    expect(chunkOf(aware, DRAWER).fileName).not.toBe(
      chunkOf(aware, DESIGN_SYSTEM_ROOT).fileName,
    );
  });

  it('splits the charting group per route, so one subpath does not wait on another', async () => {
    // What the package's `core` / `primitives` / `xychart` subpaths are for.
    // Flat, both routes share one chunk and the sparkline route downloads
    // `@visx/xychart` it never calls.
    const flat = await buildApp(
      DEFAULT_GROUPS.map((group) => ({ ...group, entriesAware: false })),
    );
    expect(chunkOf(flat, PRIMITIVES).fileName).toBe(
      chunkOf(flat, XYCHART).fileName,
    );
    expect(chunkOf(flat, VISX_SHAPE).fileName).toBe(
      chunkOf(flat, VISX_XYCHART).fileName,
    );

    const aware = await buildApp(codeSplitting().groups);
    expect(chunkOf(aware, PRIMITIVES).fileName).not.toBe(
      chunkOf(aware, XYCHART).fileName,
    );
    expect(chunkOf(aware, VISX_SHAPE).fileName).not.toBe(
      chunkOf(aware, VISX_XYCHART).fileName,
    );
  });

  it('takes each package dependency closure with it, without naming one', async () => {
    // Neither group lists a dependency of the package it captures. Ark UI,
    // lucide and visx arrive through `includeDependenciesRecursively`, which is
    // what keeps this package from holding a copy of two dependency lists.
    const chunks = await buildApp(codeSplitting().groups);

    expect(chunkOf(chunks, ARK).name).toMatch(/^design-system/);
    expect(chunkOf(chunks, 'lucide-react/dist/index.js').name).toMatch(
      /^design-system/,
    );
    expect(chunkOf(chunks, VISX_XYCHART).name).toMatch(/^charting/);
  });

  it('keeps React shared rather than letting a package closure claim it', async () => {
    // React is a peer dependency of both packages, so the recursion above
    // reaches it. Drop the react group and it stops being shared: the design
    // system's closure takes it, and the priority ordering is what prevents
    // that in the shipped preset.
    const withoutReact = await buildApp(
      DEFAULT_GROUPS.filter((group) => group.name !== 'react'),
    );
    expect(chunkOf(withoutReact, REACT).name).toMatch(/^design-system/);

    const chunks = await buildApp(codeSplitting().groups);
    const react = chunkOf(chunks, REACT);
    expect(react.name).toBe('react');
    expect(react.moduleIds).toHaveLength(4);
  });

  it('leaves shared design-system modules in the design chunk, not the chart one', async () => {
    // Charting takes the design system as a peer dependency, so its closure
    // reaches back into it. Ordering the groups the other way round pulls the
    // shared root into the chart chunk, where the entry cannot reach it.
    const chunks = await buildApp(codeSplitting().groups);
    expect(chunkOf(chunks, DESIGN_SYSTEM_ROOT).name).toMatch(/^design-system/);

    const inverted = await buildApp(
      DEFAULT_GROUPS.map((group) =>
        group.name === 'charting'
          ? { ...group, priority: GROUP_PRIORITIES.designSystem + 1 }
          : group,
      ),
    );
    expect(chunkOf(inverted, DESIGN_SYSTEM_ROOT).name).toMatch(/^charting/);
  });

  it('groups a workspace-linked design system too', async () => {
    // Vite resolves with `preserveSymlinks: false`, so a linked package's
    // module ids carry its real path and no scope segment at all. A test
    // written as `@archon-research/design-system` matches the installed layout
    // and silently matches nothing here.
    const linked = linkedFixtureApp();
    const chunks = await buildApp(codeSplitting().groups, linked);

    const design = chunkOf(chunks, 'packages/design-system/dist/index.js');
    expect(design.name).toMatch(/^design-system/);
    expect(design.moduleIds.some((id) => id.includes('@archon-research'))).toBe(
      false,
    );

    const scoped = await buildApp(
      DEFAULT_GROUPS.map((group) =>
        group.name === 'design-system'
          ? { ...group, test: /[\\/]@archon-research[\\/]design-system[\\/]/ }
          : group,
      ),
      linked,
    );
    expect(
      chunkOf(scoped, 'packages/design-system/dist/index.js').name,
    ).not.toMatch(/^design-system/);
  });

  it('lets an app group take modules back by outranking the default', async () => {
    // The deliberate trade in matching on a directory name: over-capture is
    // fixable from the consumer side, under-capture is not. Appending alone is
    // not enough — the group has to clear the default's priority.
    const appGroup = (priority: number): CodeSplittingGroup => ({
      name: 'app-drawer',
      test: /[\\/]components[\\/]Drawer\.js$/,
      priority,
    });

    const below = await buildApp(
      codeSplitting({ groups: [appGroup(GROUP_PRIORITIES.designSystem)] })
        .groups,
    );
    expect(chunkOf(below, DRAWER).name).toMatch(/^design-system/);

    const above = await buildApp(
      codeSplitting({ groups: [appGroup(GROUP_PRIORITIES.designSystem + 1)] })
        .groups,
    );
    expect(chunkOf(above, DRAWER).name).toBe('app-drawer');
  });

  it('appends app groups without dropping the defaults', () => {
    const extra: CodeSplittingGroup = { name: 'app', test: /src/ };
    expect(codeSplitting({ groups: [extra] }).groups).toEqual([
      ...DEFAULT_GROUPS,
      extra,
    ]);
    expect(codeSplitting().groups).toEqual([...DEFAULT_GROUPS]);
  });
});
