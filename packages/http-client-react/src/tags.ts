import { operationToken } from './query-key.js';

// Ambient, package-local declaration — this package's `tsconfig.json` has no
// `"types": ["node"]` reference, so `process` isn't otherwise a known global.
// Declaring it as possibly `undefined` keeps the `typeof process` guard below
// meaningful to the type checker without pulling in `@types/node`.
declare const process: { env?: { NODE_ENV?: string } } | undefined;

/**
 * Bundlers statically replace `process.env.NODE_ENV`, so a production build
 * collapses this to `false` and drops the warning call; the `typeof` guard
 * keeps it safe to evaluate where no global `process` exists at all.
 */
const IS_DEV =
  typeof process !== 'undefined' && process?.env?.NODE_ENV !== 'production';

/**
 * Maps tags to the endpoints that carry them.
 *
 * Membership is recorded where the tag is declared — on the `queryOptions`
 * call — so the query itself stays the single place an endpoint's cache
 * behaviour is described. Nothing has to be mirrored into a second registry.
 *
 * Granularity is per `${method} ${path}`, not per key: invalidating a tag
 * invalidates every cached variant of the endpoints under it, whatever their
 * params. That is what "refetch the user list" almost always means, and it
 * keeps the registry bounded by endpoint count rather than by cache size.
 */
export type TagRegistry<TTag extends string> = {
  register: (tag: TTag, method: string, path: string) => void;
  assertKnown: (tag: TTag) => void;
  /**
   * Whether `tag` may be acted on, warning once per unknown tag rather than
   * throwing. For tags that only materialize *after* a request has already
   * succeeded — the ones an `invalidates` callback derives from a mutation's
   * result — where a throw would report the successful mutation as failed.
   */
  acceptOrWarn: (tag: TTag) => boolean;
  /** Whether a `[method, path, …]` query key belongs to `tag`. */
  matches: (tag: TTag, queryKey: readonly unknown[]) => boolean;
  /** The `${method} ${path}` tokens currently registered under `tag`. */
  endpoints: (tag: TTag) => readonly string[];
};

export function createTagRegistry<TTag extends string>(
  vocabulary?: readonly TTag[],
): TagRegistry<TTag> {
  const known = vocabulary ? new Set<string>(vocabulary) : undefined;
  const endpointsByTag = new Map<string, Set<string>>();
  const warned = new Set<string>();

  /** Names the vocabulary, for a message that has to report a tag outside it. */
  const describeVocabulary = (declared: Set<string>): string =>
    `Declared tags: ${[...declared].join(', ') || '(none)'}`;

  // Both checks below read `known` directly rather than through a shared
  // predicate: with no vocabulary there is no closed set, so no tag is unknown
  // and neither branch is reachable.
  const assertKnown = (tag: TTag): void => {
    if (known && !known.has(tag)) {
      throw new Error(
        `http-client-react: unknown tag "${tag}". ${describeVocabulary(known)}`,
      );
    }
  };

  const acceptOrWarn = (tag: TTag): boolean => {
    if (!known || known.has(tag)) return true;

    if (IS_DEV && !warned.has(tag)) {
      warned.add(tag);
      console.warn(
        `http-client-react: skipping unknown tag "${tag}" produced by an ` +
          `invalidates callback — nothing was invalidated for it. ` +
          describeVocabulary(known),
      );
    }

    return false;
  };

  return {
    assertKnown,
    acceptOrWarn,
    register: (tag, method, path) => {
      assertKnown(tag);
      const tokens = endpointsByTag.get(tag) ?? new Set<string>();
      tokens.add(operationToken(method, path));
      endpointsByTag.set(tag, tokens);
    },
    matches: (tag, queryKey) => {
      const tokens = endpointsByTag.get(tag);
      if (!tokens) return false;
      const [method, path] = queryKey;
      if (typeof method !== 'string' || typeof path !== 'string') return false;
      return tokens.has(operationToken(method, path));
    },
    endpoints: (tag) => [...(endpointsByTag.get(tag) ?? [])],
  };
}
