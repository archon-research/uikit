// `@ladle/react/meta` ships no type declarations: the package's exports map
// points the subpath straight at `./api/meta.js` with no `types` condition, so
// TypeScript cannot reach the upstream `typings-for-build/cli/get-meta.d.ts`
// (that path is not exported either). Declare the slice check-orphan-snapshots
// consumes — the story-id-keyed map `getMeta()` resolves to, matching what
// Ladle writes to `dist/meta.json`.
declare module '@ladle/react/meta' {
  type LadleStory = {
    name: string;
    levels: string[];
    filePath: string;
  };

  type LadleMeta = {
    stories: Record<string, LadleStory>;
  };

  const getMeta: () => Promise<LadleMeta>;
  export default getMeta;
}
