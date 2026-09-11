/**
 * Renormalizes relative panel weights (`SplitLayoutPanel.size`, default `1`)
 * into percentages summing to 100 — the initial `defaultSize` Ark Splitter
 * seeds from. An empty weight list yields an empty list; any list that cannot
 * be renormalized falls back to an even split across however many weights were
 * given.
 *
 * A weight list is renormalizable only when every entry is a finite number
 * that is not negative, and at least one is above zero. The excluded cases are
 * not hypothetical: a persisted layout restored with
 * `Number(localStorage.getItem(key)) ?? 1` yields `NaN` (`??` does not catch
 * it, because `NaN` is not nullish), and `NaN` propagates through the division
 * to make EVERY percentage `NaN`. Mixed signs are just as bad without being
 * obviously wrong — `[2, -1]` has a positive total, so it renormalizes to
 * `[200, -100]`. Both used to reach Ark's `defaultSize` unchanged; an even
 * split is the recoverable answer.
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
  const evenSplit = () => weights.map(() => 100 / weights.length);
  if (!weights.every((weight) => Number.isFinite(weight) && weight >= 0)) {
    return evenSplit();
  }
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  // Every weight is finite and non-negative here, so the only totals left to
  // reject are zero (every panel weighted `0`) and the Infinity a sum of very
  // large finite weights can overflow to — which would divide down to all-zero
  // percentages rather than percentages summing to 100.
  if (total <= 0 || !Number.isFinite(total)) return evenSplit();
  return weights.map((weight) => (weight / total) * 100);
}

/**
 * Narrows `SplitLayout`'s `size` prop to a value that actually controls the
 * layout, so the controlled/uncontrolled decision is made once instead of
 * being inferred from truthiness at each use site.
 *
 * `[]` is the case worth a function: it is truthy, so a plain `size ? … : …`
 * reads it as "controlled" and suppresses the derived `defaultSize`, while Ark
 * has no per-panel size to apply either — the layout ends up with neither, and
 * every panel renders at an equal share whatever weights were passed. An empty
 * array cannot describe an N-panel split for any N > 0, so it is treated as
 * absent.
 */
export function resolveControlledSize(
  size: number[] | undefined,
): number[] | undefined {
  return size !== undefined && size.length > 0 ? size : undefined;
}
