import { z } from 'zod';

/**
 * Collapses a raw URL search value to the text a param means, or `undefined`
 * when it means nothing.
 *
 * ## Why a normalizer is needed at all
 *
 * `validateSearch` never sees the raw query text. `parseSearch` has already
 * decoded it, and decoding coerces spellings, so a parser written against
 * `string` meets four other shapes in production:
 *
 * | URL              | value reaching the parser |
 * | ---------------- | ------------------------- |
 * | `?rows=25`       | the number `25`           |
 * | `?dense=true`    | the boolean `true`        |
 * | `?q=` or `?q`    | the empty string `''`     |
 * | `?q=a&q=b`       | the array `['a', 'b']`    |
 *
 * How much coercion depends on the grammar the router was built with, and both
 * common choices coerce:
 *
 * - `parseSearchWith(JSON.parse)` — the router's **default**. It applies the qss
 *   decode above and then `JSON.parse`s every value still a string, so `?v=1e5`
 *   arrives as `100000`, `?v=null` as `null`, and `?v=-0` as `0`.
 * - `parseSearchWith((value) => value)` — the identity parser, for apps whose
 *   params are plain text. Stops after the qss decode, so those three stay
 *   strings.
 *
 * A hand-written `parseSearch` is the decoder rather than a stage after it, so
 * it can opt out entirely — but then it owns the whole grammar.
 *
 * ## What is and is not promised
 *
 * **Promised: idempotence.** Feeding this function's own output back through a
 * render-and-redecode round trip returns that output unchanged, under either
 * grammar above. That is the property the entry-time cleanup needs to terminate.
 *
 * **Not promised: byte-preserved URL text.** Under the default grammar `?v=1e5`
 * canonicalizes to `100000` and `?v=-0` to `0`, because the value really was
 * decoded to a number. That is one rewrite, not a loop — the second pass is
 * stable, which is what the settle harness checks.
 */
export function toSearchText(value: unknown): string | undefined {
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  // Arrays (a repeated key), objects, `null`, and absence all mean "no usable
  // value", which the schemas below spell as `undefined`.
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/**
 * Narrows a raw URL value (or a raw control value) to a closed option set.
 * Exported alongside the schema builder because the change handlers that write
 * a param back need the same rule the schema applied when reading it — two
 * spellings of "is this allowed" would be one drift away from a control that
 * can set a value the URL then drops.
 */
export function toSearchOption<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined {
  const text = toSearchText(value);

  if (text === undefined) {
    return undefined;
  }

  // Widened rather than narrowed: `includes` on a `readonly T[]` would demand a
  // `T` here, which is the very thing being decided. One cast on the way out.
  return (allowed as readonly string[]).includes(text)
    ? (text as T)
    : undefined;
}

/**
 * Schema shape returned by {@link textParam}. Named so the built `.d.ts` states
 * the param's output type instead of inlining zod's internal generics.
 */
export type SearchTextParam = z.ZodOptional<
  z.ZodPipe<z.ZodUnknown, z.ZodTransform<string | undefined, unknown>>
>;

/**
 * A free-text search param: trimmed, with empty and unusable values degrading
 * to absent. Use for identifiers, query strings, and timestamps — anything
 * whose value set is open.
 *
 * Total and idempotent by construction; see the contract note on this module's
 * builders below.
 */
export function textParam(): SearchTextParam {
  return z.optional(z.unknown().transform(toSearchText));
}

/**
 * Schema shape returned by {@link oneOfParam}, carrying the closed option set
 * through to the inferred search type.
 */
export type SearchOptionParam<T extends string> = z.ZodOptional<
  z.ZodPipe<z.ZodUnknown, z.ZodTransform<T | undefined, unknown>>
>;

/**
 * A closed-set param: one of `allowed`, or absent. Use for tabs, modes, sort
 * directions, and flags whose spellings are fixed — a hand-edited or stale
 * value degrades to absent rather than reaching a component that has no case
 * for it.
 *
 * Pass `allowed` as `[...] as const` (or a `readonly` tuple) so the inferred
 * search type is the literal union rather than `string`.
 */
export function oneOfParam<T extends string>(
  allowed: readonly T[],
): SearchOptionParam<T> {
  return z.optional(
    z.unknown().transform((value) => toSearchOption(value, allowed)),
  );
}

/*
 * ## Writing a param of your own
 *
 * The total-and-idempotent contract (see `toSearchText`) is what
 * `createValidatedSearchRedirect` needs to terminate, so a custom param has to
 * keep it. Three rules cover it:
 *
 *  1. Build on `toSearchText`, so the decoder's coercions are already absorbed.
 *  2. Keep the transform a pure function of that text — no state, no clock, no
 *     counter. A param that grows or varies per call cannot converge.
 *  3. Return absent, or a value that renders to text this module maps back to
 *     that same value. Notably `null` is *not* such a value: it is neither
 *     dropped as absent nor stable across both grammars.
 *
 * `settleEntryUrl` (from the `/testing` subpath) is the executable check — point
 * it at the real route tree and it fails on a param that does not converge.
 */
