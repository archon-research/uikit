// Attribute a `package-lock.json` change to the workspace packages it actually
// concerns, so that a lockfile touch stops meaning "publish everything".
//
// `affected-packages.ts` maps each changed file to the workspace directory that
// owns it. The lockfile is the one file it cannot map that way: it sits at the
// repo root but describes every package's dependency tree at once. Most
// lockfile churn is a Renovate bump of one dependency that only a couple of
// workspaces pull in, so blanket-publishing on any lockfile change republishes
// byte-identical copies of everything else -- exactly what the affected-set
// logic exists to avoid.
//
// How it works:
//   1. Parse both revisions of the lockfile and diff its `packages` map key by
//      key -- added, removed, or deep-unequal value.
//   2. Attribute each changed key to workspace directories:
//        `packages/<name>`                        -> that workspace
//        `packages/<name>/node_modules/<dep>`     -> that workspace
//        `node_modules/<dep>`(possibly nested)    -> every workspace that can
//                                                    reach it through the
//                                                    lockfile's own graph
//        `""` (the root entry)                    -> everything, if any field
//                                                    that can influence a build
//                                                    moved
//   3. Return the union of those directories, or `all` the moment attribution
//      is uncertain.
//
// Over-publishing is safe; missing a package is not. Every branch that cannot
// prove which workspaces a change belongs to returns `all` rather than guessing,
// and the caller treats that as "publish the full set".
//
// This module is deliberately pure -- no fs, no git, no process. The caller
// reads both revisions of the file (merge-base and HEAD) and passes their text.

export type LockfileImpact =
  // `dirs` are lockfile workspace keys, e.g. "packages/design-system", which is
  // the same string `affected-packages.ts` uses as a workspace directory. An
  // empty array means the lockfile changed nothing that concerns any package.
  | { kind: 'workspaces'; dirs: string[] }
  // Attribution failed or the change is repo-wide: publish everything.
  | { kind: 'all'; reason: string };

// npm 7+ writes v2 (which carries a legacy `dependencies` mirror) and v3. This
// repo is on v3, and v3 is the only shape the walk below understands, so
// anything else -- an older lockfile, a future format, a `lockfileVersion` that
// is not a number at all -- is treated as unreadable rather than parsed on the
// assumption that the layout stayed the same.
const SUPPORTED_LOCKFILE_VERSION = 3;

// The edges of the tree walk. `devDependencies` matters as much as the runtime
// ones: it only ever appears on workspace and root entries, and that is exactly
// where a build-time dependency (a type package, a bundler) enters the graph.
const DEP_FIELDS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const;

// Fields of the root (`""`) entry that provably cannot change what any package
// builds into. This is an allowlist rather than a blocklist of dangerous fields
// on purpose: an unrecognised root field is far more likely to be something new
// that matters (a new dependency kind, a new install-time knob) than something
// inert, so the unknown case has to fall through to `all`.
//
// `workspaces` is inert here because adding or removing a workspace also adds or
// removes its own `packages/<name>` entry, which is attributed directly.
//
// `engines` is inert for a different reason: npm mirrors it here from the root
// package.json and backfills it on any install, so it drifts into a lockfile
// diff without anything having actually changed. A real engines change moves the
// root package.json too, and `affected-packages.ts` already treats that field
// there as forcing a full publish -- so silencing the mirror loses no coverage.
const INERT_ROOT_FIELDS = new Set([
  'author',
  'bugs',
  'description',
  'engines',
  'funding',
  'homepage',
  'keywords',
  'license',
  'name',
  'private',
  'repository',
  'version',
  'workspaces',
]);

type LockEntry = {
  // Workspace entries are materialised in the tree as symlinks: a
  // `node_modules/@scope/name` key with `link: true` whose `resolved` points at
  // the `packages/<name>` entry holding the real dependency lists.
  link?: boolean;
  resolved?: string;
  dependencies?: Record<string, unknown>;
  devDependencies?: Record<string, unknown>;
  peerDependencies?: Record<string, unknown>;
  optionalDependencies?: Record<string, unknown>;
  [field: string]: unknown;
};

type Lockfile = {
  entries: Map<string, LockEntry>;
  // Every non-root key with no `node_modules` segment: npm only writes those for
  // workspaces (and other linked local paths), so this is the lockfile's own
  // account of which directories are packages.
  workspaceDirs: Set<string>;
};

type ParseResult = { ok: true; lock: Lockfile } | { ok: false; reason: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Structural equality over parsed JSON. Comparing the raw text of an entry would
// be cheaper but would report reformatting (key order, indentation) as a change,
// and npm does reorder keys between versions.
const deepEqual = (left: unknown, right: unknown): boolean => {
  if (left === right) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    return (
      left.length === right.length &&
      left.every((item, index) => deepEqual(item, right[index]))
    );
  }
  if (!isRecord(left) || !isRecord(right)) return false;
  const leftKeys = Object.keys(left);
  if (leftKeys.length !== Object.keys(right).length) return false;
  return leftKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(right, key) &&
      deepEqual(left[key], right[key]),
  );
};

// All narrowing happens here, once, so the walk below can read `LockEntry`
// fields without re-checking them. Anything that does not match the v3 shape is
// a parse failure rather than a field to skip: a lockfile this code cannot fully
// understand is one whose graph it cannot trust to be complete.
const parseLockfile = (text: string): ParseResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, reason: 'is not valid JSON' };
  }

  if (!isRecord(parsed)) return { ok: false, reason: 'is not a JSON object' };

  if (parsed['lockfileVersion'] !== SUPPORTED_LOCKFILE_VERSION) {
    return {
      ok: false,
      reason: `has lockfileVersion ${JSON.stringify(parsed['lockfileVersion'])}, expected ${SUPPORTED_LOCKFILE_VERSION}`,
    };
  }

  const packages = parsed['packages'];
  if (!isRecord(packages)) {
    return { ok: false, reason: 'has no `packages` map' };
  }

  const entries = new Map<string, LockEntry>();
  const workspaceDirs = new Set<string>();

  for (const [key, value] of Object.entries(packages)) {
    if (!isRecord(value)) {
      return { ok: false, reason: `entry \`${key}\` is not an object` };
    }
    for (const field of DEP_FIELDS) {
      const deps = value[field];
      if (deps !== undefined && !isRecord(deps)) {
        return { ok: false, reason: `\`${key}\`.${field} is not an object` };
      }
    }
    entries.set(key, value);
    if (key !== '' && !key.split('/').includes('node_modules')) {
      workspaceDirs.add(key);
    }
  }

  return { ok: true, lock: { entries, workspaceDirs } };
};

const depNames = (entry: LockEntry): string[] =>
  DEP_FIELDS.flatMap((field) => Object.keys(entry[field] ?? {}));

// npm's resolution rule, expressed over lockfile keys: a package at `fromKey`
// resolves `name` by looking in its own `node_modules`, then in each enclosing
// directory's `node_modules`, out to the root. Walking "up" is the same as
// dropping the trailing `/node_modules/<pkg>` segment from the key, which works
// for scoped names too because the cut is anchored on `/node_modules/` rather
// than on a slash count. A key that does not exist is simply not a hit, so the
// intermediate directories npm would stat but the lockfile never names (say
// `packages/node_modules/`) cost nothing.
const resolveDep = (
  lock: Lockfile,
  fromKey: string,
  name: string,
): string | undefined => {
  let scope = fromKey;
  for (;;) {
    const candidate =
      scope === '' ? `node_modules/${name}` : `${scope}/node_modules/${name}`;
    if (lock.entries.has(candidate)) return candidate;
    if (scope === '') return undefined;
    const cut = scope.lastIndexOf('/node_modules/');
    scope = cut === -1 ? '' : scope.slice(0, cut);
  }
};

// Everything one workspace can pull in, transitively. Starting from the
// workspace entry rather than from the root is what makes attribution possible
// at all: a hoisted `node_modules/<dep>` sits in a directory shared by every
// package, and only the declared edges say whose it is.
const reachableFrom = (lock: Lockfile, startKey: string): Set<string> => {
  const seen = new Set<string>([startKey]);
  const queue = [startKey];

  for (let index = 0; index < queue.length; index += 1) {
    const key = queue[index];
    // In range by the loop bound; the guard is what narrows it.
    if (key === undefined) continue;
    const entry = lock.entries.get(key);
    if (entry === undefined) continue;

    const visit = (next: string | undefined): void => {
      if (next === undefined || seen.has(next)) return;
      seen.add(next);
      queue.push(next);
    };

    // A link entry holds no dependencies of its own -- they live on the
    // `packages/<name>` entry it resolves to -- so an internal dependency is a
    // dead end unless the walk hops across the symlink.
    if (entry.link === true && typeof entry.resolved === 'string') {
      visit(entry.resolved);
      continue;
    }

    for (const name of depNames(entry)) visit(resolveDep(lock, key, name));
  }

  return seen;
};

// Which workspaces can reach each hoisted entry, computed once per revision and
// unioned. Both revisions matter because a changed key may exist in only one of
// them: a removed dependency is reachable only in `before`, an added one only in
// `after`, and either way the workspaces that gained or lost it are affected.
const reachabilityByWorkspace = (lock: Lockfile): Map<string, Set<string>> => {
  const byWorkspace = new Map<string, Set<string>>();
  for (const dir of lock.workspaceDirs) {
    byWorkspace.set(dir, reachableFrom(lock, dir));
  }
  return byWorkspace;
};

// Root-entry changes are all-or-nothing. Its dependency lists install into the
// shared root `node_modules` that every workspace compiles against (`typescript`
// lives there), `overrides` silently rewrites versions anywhere in the tree, and
// `engines`/`packageManager` change which npm resolves the tree in the first
// place -- none of which can be pinned to one package.
const rootChangeReason = (
  before: LockEntry | undefined,
  after: LockEntry | undefined,
): string | null => {
  const fields = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);
  const changed = [...fields]
    .filter((field) => !INERT_ROOT_FIELDS.has(field))
    .filter((field) => !deepEqual(before?.[field], after?.[field]))
    .sort();

  return changed.length === 0
    ? null
    : `the lockfile's root entry changed ${changed.map((field) => `\`${field}\``).join(', ')}`;
};

export function lockfileImpact(before: string, after: string): LockfileImpact {
  // Cheap exit for the common case, and the only correct answer when the caller
  // hands us two absent lockfiles (both `''`).
  if (before === after) return { kind: 'workspaces', dirs: [] };

  // One side empty means the lockfile was added or deleted wholesale. There is
  // no meaningful per-key diff against nothing, and either event is a repo-wide
  // event anyway.
  if (before === '' || after === '') {
    return {
      kind: 'all',
      reason: `package-lock.json was ${before === '' ? 'added' : 'removed'}`,
    };
  }

  const parsedBefore = parseLockfile(before);
  if (!parsedBefore.ok) {
    return {
      kind: 'all',
      reason: `package-lock.json at the merge-base ${parsedBefore.reason}`,
    };
  }
  const parsedAfter = parseLockfile(after);
  if (!parsedAfter.ok) {
    return {
      kind: 'all',
      reason: `package-lock.json at HEAD ${parsedAfter.reason}`,
    };
  }

  const beforeLock = parsedBefore.lock;
  const afterLock = parsedAfter.lock;

  const changedKeys = [
    ...new Set([...beforeLock.entries.keys(), ...afterLock.entries.keys()]),
  ].filter(
    (key) =>
      !deepEqual(beforeLock.entries.get(key), afterLock.entries.get(key)),
  );

  const dirs = new Set<string>();
  // Reachability is only needed for hoisted keys and costs a walk per workspace
  // per revision, so it is built on first use rather than up front.
  let reachability: Map<string, Set<string>>[] | null = null;

  for (const key of changedKeys) {
    if (key === '') {
      const reason = rootChangeReason(
        beforeLock.entries.get(''),
        afterLock.entries.get(''),
      );
      if (reason !== null) return { kind: 'all', reason };
      continue;
    }

    if (!key.startsWith('node_modules/')) {
      const nested = key.indexOf('/node_modules/');

      // A workspace's own entry: its manifest moved.
      if (nested === -1) {
        dirs.add(key);
        continue;
      }

      // A dependency installed inside a workspace's own `node_modules`, which
      // npm only does when that workspace needs a version the hoisted tree
      // cannot give it. It belongs to that workspace and nobody else.
      const owner = key.slice(0, nested);
      if (
        beforeLock.workspaceDirs.has(owner) ||
        afterLock.workspaceDirs.has(owner)
      ) {
        dirs.add(owner);
        continue;
      }

      // A `<path>/node_modules/<dep>` key whose `<path>` is not a package the
      // lockfile declares. Nothing here knows what owns it.
      return {
        kind: 'all',
        reason: `lockfile entry \`${key}\` is nested under \`${owner}\`, which is not a workspace`,
      };
    }

    // From here on the key is hoisted: it lives in the shared root tree.
    const entry = afterLock.entries.get(key) ?? beforeLock.entries.get(key);

    // A workspace symlink. It stands for the package it points at, so attribute
    // it there directly -- resolving it by reachability instead would report a
    // brand-new package that nothing depends on yet as unattributable.
    if (entry?.link === true && typeof entry.resolved === 'string') {
      const target = entry.resolved;
      if (
        beforeLock.workspaceDirs.has(target) ||
        afterLock.workspaceDirs.has(target)
      ) {
        dirs.add(target);
        continue;
      }
      return {
        kind: 'all',
        reason: `lockfile entry \`${key}\` links to \`${target}\`, which is not a workspace`,
      };
    }

    reachability ??= [
      reachabilityByWorkspace(beforeLock),
      reachabilityByWorkspace(afterLock),
    ];

    let owners = 0;
    for (const byWorkspace of reachability) {
      for (const [dir, reachable] of byWorkspace) {
        if (!reachable.has(key)) continue;
        dirs.add(dir);
        owners += 1;
      }
    }

    // Reachable from no workspace at all. That is either a dependency of the
    // root manifest only -- root devDependencies are build tooling shared by
    // every package -- or a gap in this walk's model of npm's resolution. Both
    // are reasons to stop trusting the attribution for this diff.
    if (owners === 0) {
      return {
        kind: 'all',
        reason: `lockfile entry \`${key}\` changed but no workspace package reaches it`,
      };
    }
  }

  return { kind: 'workspaces', dirs: [...dirs].sort() };
}
