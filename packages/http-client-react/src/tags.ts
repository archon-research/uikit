import { operationToken } from './query-key.js';

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

  const assertKnown = (tag: TTag): void => {
    if (known && !known.has(tag)) {
      throw new Error(
        `http-client-react: unknown tag "${tag}". Declared tags: ${
          [...known].join(', ') || '(none)'
        }`,
      );
    }
  };

  return {
    assertKnown,
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
