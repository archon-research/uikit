import { z } from 'zod';

/**
 * Collapses a raw URL search value to the text a param means, or `undefined`
 * when it means nothing.
 *
 * ## Why a normalizer is needed at all
 *
 * The router decodes the query string **before** any `validateSearch` parser
 * runs, and that decoder coerces spellings. A parser written against `string`
 * therefore meets four other shapes in production:
 *
 * | URL              | value reaching the parser |
 * | ---------------- | ------------------------- |
 * | `?rows=25`       | the number `25`           |
 * | `?dense=true`    | the boolean `true`        |
 * | `?q=` or `?q`    | the empty string `''`     |
 * | `?q=a&q=b`       | the array `['a', 'b']`    |
 *
 * Registering a custom `parseSearch` does not move this: the decoder runs first
 * and the custom parser only sees what it produced.
 *
 * ## Why the round trip is stable
 *
 * The coercion is narrower than it looks, and that narrowness is what makes
 * this function a fixed point rather than a lossy pass. The decoder only
 * produces a number when the text is that number's own canonical spelling
 * (`+text + '' === text`), so `0001`, `1e5`, `-0`, `Infinity`, `NaN`, and `null`
 * all stay strings. Every non-empty string this returns therefore renders back
 * to the exact text it came from, and re-decodes to a value this maps to the
 * same string again.
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
  return allowed.includes(text as T) ? (text as T) : undefined;
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
 * ## The contract these builders hold
 *
 * Every builder here is **total** and **idempotent**, and both properties are
 * load-bearing rather than incidental.
 *
 * **Total** — no input fails. The parser accepts `unknown` and answers with a
 * value or `undefined` for every one of them, so `validateSearch` never rejects
 * a URL. A hand-edited, stale, or bot-mangled param degrades to absent and the
 * route still renders; it cannot 404 the page or throw inside a router
 * transition.
 *
 * **Idempotent** — normalizing an already-normalized value, through a full
 * render-and-redecode round trip, returns it unchanged. This is what makes the
 * URL-truthfulness cleanup in `validated-search.ts` terminate: that helper
 * rewrites the address bar to whatever validation applied, so a param whose
 * output failed to re-validate to itself would rewrite the same URL forever.
 * The settle harness in `testing.ts` is the executable check — it follows entry
 * redirects to a fixed point and throws when one is not reached.
 *
 * A custom param built on top of these keeps the contract as long as its
 * transform is a pure function of the normalized text with no state and no
 * clock, and its output is either absent or a value that renders to text this
 * module maps back to that same output.
 */
