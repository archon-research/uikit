import type { Rolldown } from 'vite';

/**
 * Chunk groups every app on this toolkit wants, written once.
 *
 * Vite 8 bundles with rolldown, so the option these land in is
 * `build.rolldownOptions.output.codeSplitting.groups`. Two older spellings are
 * still accepted and both are traps:
 *
 * - `output.advancedChunks` takes the same `groups` array and logs
 *   `advancedChunks option is deprecated, please use codeSplitting instead.`
 *   So it is wrong, but at least it says so.
 * - `output.manualChunks` — the Rollup callback — is compiled into a single
 *   group with a dynamic `name()`, and logs nothing at all. It produces
 *   correctly named chunks, which is why a stale snippet looks like it worked.
 *   What it cannot express is {@link DESIGN_SYSTEM_GROUP}'s `entriesAware`: a
 *   `manualChunks` build is permanently the flat grouping, which is the exact
 *   shape that drags lazy-only design-system code into the entry chunk.
 */

/** One chunk group, as rolldown's `codeSplitting.groups` takes it. */
export type CodeSplittingGroup = Rolldown.CodeSplittingGroup;

/**
 * The priority of each group this preset ships.
 *
 * Higher wins, and a module a group claims is removed from every lower one, so
 * these decide the overlaps rather than the order of the array. They are spaced
 * so an app group can sit between two of them:
 *
 * ```ts
 * codeSplitting({
 *   groups: [
 *     { name: 'app-charts', test: /[\\/]src[\\/]charts[\\/]/,
 *       priority: GROUP_PRIORITIES.charting + 1 },
 *   ],
 * });
 * ```
 *
 * Ties go to the group declared first, and this preset's groups are declared
 * first — so taking modules back from one means going strictly above it.
 */
export const GROUP_PRIORITIES = {
  react: 30,
  designSystem: 20,
  charting: 10,
} as const;

/**
 * The React runtime, which every entry needs and which therefore belongs in one
 * shared chunk rather than being split per entry.
 *
 * This is the one group that insists on `node_modules`, because React is never
 * a workspace package and the bare word is too common to match on a path
 * segment alone. The alternation is anchored on both sides for the usual
 * reason: `react` without the trailing separator also matches `react-dom`, and
 * without the leading one it matches `lucide-react` and `@ark-ui/react` — both
 * of which belong in {@link DESIGN_SYSTEM_GROUP}.
 */
export const REACT_TEST =
  /[\\/]node_modules[\\/](?:react|react-dom|scheduler)[\\/]/;

/**
 * The design system, matched on its directory name rather than on
 * `@archon-research/design-system`.
 *
 * Vite resolves with `preserveSymlinks: false`, so a workspace-linked or
 * `npm link`ed package arrives under its real path, somewhere like
 * `packages/design-system/dist/index.js`, with no scope segment anywhere in
 * it. A scoped pattern
 * matches the installed layout and silently matches nothing in the linked one,
 * and nothing about that failure is visible: the build succeeds and the chunk
 * simply never appears.
 *
 * The cost is the opposite error — an app with its own `src/design-system/`
 * directory has it swept into this chunk. That one a consumer can fix by
 * declaring a group above {@link GROUP_PRIORITIES.designSystem}, which is why
 * it is the error worth having.
 */
export const DESIGN_SYSTEM_TEST = /[\\/]design-system[\\/]/;

/** The charting package, matched on its directory name for the same reason. */
export const CHARTING_TEST = /[\\/]charting[\\/]/;

/**
 * `includeDependenciesRecursively` is rolldown's default, restated here because
 * these two groups are built on it: neither names a single dependency of the
 * package it captures, and both rely on the closure coming along. That is what
 * puts `@ark-ui/react`, `@tanstack/react-table`, `@tanstack/react-virtual` and
 * `lucide-react` in the design chunk and `@visx/*` in the charting one without
 * this package holding a copy of either dependency list — a copy that would go
 * stale with no build failing.
 *
 * It is also why {@link GROUP_PRIORITIES.react} has to outrank them. React is a
 * peer dependency of both packages, so recursion reaches it, and the group that
 * claims it first is the one that decides whether it is shared.
 */
const INCLUDE_DEPENDENCIES_RECURSIVELY = true;

/**
 * The React runtime, in one chunk shared by every entry.
 *
 * Deliberately not `entriesAware`: splitting React per entry set would hand
 * each lazy route its own copy of code the entry has already loaded.
 */
export const REACT_GROUP: CodeSplittingGroup = {
  name: 'react',
  test: REACT_TEST,
  priority: GROUP_PRIORITIES.react,
};

/**
 * The design system and its dependency closure, split by which entries reach
 * it.
 *
 * `entriesAware` is the whole point of this group. Flat, every module any entry
 * touches lands in one chunk, and the entry statically imports that chunk for
 * the parts it does need — so a drawer that exists only behind a lazy route
 * ships in the entry anyway, along with the Ark UI and icon code it drags. That
 * is not a hypothetical: it is what a consumer measured at 38 kB raw.
 *
 * Set, the group splits into `design-system~<entry>` chunks, one per set of
 * entries that actually import the modules in it. The entry keeps what it uses
 * and the lazy route keeps the rest.
 *
 * This is also what makes the package's subpath exports pay off. Importing
 * `@archon-research/design-system/drawer` keeps the drawer out of the root
 * barrel's graph; `entriesAware` is what then keeps it out of the entry's
 * chunk. Either one alone leaves the code in the entry.
 */
export const DESIGN_SYSTEM_GROUP: CodeSplittingGroup = {
  name: 'design-system',
  test: DESIGN_SYSTEM_TEST,
  priority: GROUP_PRIORITIES.designSystem,
  entriesAware: true,
  includeDependenciesRecursively: INCLUDE_DEPENDENCIES_RECURSIVELY,
};

/**
 * The charting package and the visx code underneath it.
 *
 * Lowest priority of the three on purpose. Charting takes the design system as
 * a peer dependency, so its closure reaches back into it; the lower priority
 * leaves those modules in {@link DESIGN_SYSTEM_GROUP}, where the entry and the
 * chart route share them, instead of pulling a second copy into the chart
 * chunk.
 *
 * `entriesAware` for the same reason as the design system, against the
 * package's `core` / `primitives` / `xychart` subpaths: a route that imports
 * only `primitives` should not be waiting on `@visx/xychart` because some other
 * route asked for it.
 */
export const CHARTING_GROUP: CodeSplittingGroup = {
  name: 'charting',
  test: CHARTING_TEST,
  priority: GROUP_PRIORITIES.charting,
  entriesAware: true,
  includeDependenciesRecursively: INCLUDE_DEPENDENCIES_RECURSIVELY,
};

/** The groups this preset ships, highest priority first. */
export const DEFAULT_GROUPS: readonly CodeSplittingGroup[] = [
  REACT_GROUP,
  DESIGN_SYSTEM_GROUP,
  CHARTING_GROUP,
];

export type CodeSplittingPresetOptions = {
  /**
   * App-specific groups, appended after {@link DEFAULT_GROUPS} rather than
   * replacing them.
   *
   * Priority decides every overlap, and ties go to the group declared first —
   * which is always one of the defaults. So a group meant to take modules back
   * from one of them needs a priority strictly above it; see
   * {@link GROUP_PRIORITIES}.
   */
  groups?: readonly CodeSplittingGroup[];
};

/**
 * The shared chunk groups, for `build.rolldownOptions.output.codeSplitting`:
 *
 * ```ts
 * import codeSplitting from '@archon-research/vite-config/code-splitting';
 * import { defineConfig } from 'vite';
 *
 * export default defineConfig({
 *   build: {
 *     rolldownOptions: {
 *       output: { codeSplitting: codeSplitting() },
 *     },
 *   },
 * });
 * ```
 *
 * A group that matches nothing costs nothing and emits no chunk, so an app
 * without charts can take the preset whole.
 */
export default function codeSplitting(
  options: CodeSplittingPresetOptions = {},
): Rolldown.CodeSplittingOptions {
  return {
    groups: [...DEFAULT_GROUPS, ...(options.groups ?? [])],
  };
}
