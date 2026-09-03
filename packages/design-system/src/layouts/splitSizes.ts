/**
 * Renormalizes relative panel weights (`SplitLayoutPanel.size`, default `1`)
 * into percentages summing to 100 — the initial `defaultSize` Ark Splitter
 * seeds from. A non-positive or empty weight list falls back to an even split
 * across however many weights were given (guards against a `0` total, e.g.
 * every panel weighted `0`).
 *
 * Its own module rather than an export of `SplitLayout.tsx`: it is internal
 * (neither the package root nor the `./split-layout` subpath re-exports it),
 * and `SplitLayout.tsx` IS the `./split-layout` subpath, so anything exported
 * there is public whether the root barrel forwards it or not. `splitSizes.ts`
 * is not behind any subpath, so `SplitLayout.test.ts` can exercise this
 * without rendering and without it becoming API.
 */
export function deriveDefaultSizes(weights: number[]): number[] {
  if (weights.length === 0) return [];
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return weights.map(() => 100 / weights.length);
  return weights.map((weight) => (weight / total) * 100);
}
