/**
 * The identity-bearing subset of an `openapi-fetch` request init, canonicalized
 * so that two structurally equivalent requests produce one cache entry.
 *
 * Only path params, query params, and the request body identify a resource.
 * Per-call transport concerns (`signal`, `fetch`, serializers, `headers`,
 * `baseUrl`, `parseAs`) are deliberately excluded: they are either
 * non-serializable, or — in the case of headers — carry credentials that have
 * no business being visible in a cache key or in devtools.
 */
export type SanitizedQueryInit = {
  path?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: unknown;
};

/**
 * The derived key shape: `[method, path, sanitized(init)]`. The first two
 * elements are the operation itself, so react-query's default prefix matching
 * invalidates every cached variant of an endpoint via `[method, path]`.
 */
// `TPath` is deliberately unconstrained: `PathsWithMethod` resolves to
// `keyof TPaths`, which TypeScript widens to `string | number | symbol` even
// though a generated `paths` type only ever has string keys.
export type QueryApiKey<TMethod = string, TPath = string> = readonly [
  method: TMethod,
  path: TPath,
  init: SanitizedQueryInit,
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Recursively rewrites plain objects with their keys in sorted order and their
 * `undefined`-valued properties removed. Arrays keep their order (query-array
 * order is significant on the wire) and every other value is passed through by
 * reference.
 *
 * react-query's own `hashKey` already sorts object keys before hashing, so this
 * is not what makes two orderings hit the same cache entry. What it buys is
 * everything that compares keys *structurally* rather than by hash: partial
 * `invalidateQueries` matching (`partialDeepEqual` is order- and
 * `undefined`-sensitive), `exact` filters, and reading a key in devtools.
 */
export function canonicalizeQueryKeyValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizeQueryKeyValue);
  }

  if (isPlainObject(value)) {
    const canonical: Record<string, unknown> = {};

    for (const key of Object.keys(value).sort()) {
      const entry = canonicalizeQueryKeyValue(value[key]);
      if (entry !== undefined) canonical[key] = entry;
    }

    return canonical;
  }

  return value;
}

function canonicalizeRecord(
  value: unknown,
): Record<string, unknown> | undefined {
  if (!isPlainObject(value)) return undefined;
  const canonical = canonicalizeQueryKeyValue(value) as Record<string, unknown>;
  return Object.keys(canonical).length > 0 ? canonical : undefined;
}

/**
 * Reduces an `openapi-fetch` init to its canonical, identity-bearing form.
 *
 * Empty and all-`undefined` param records collapse to absent, so
 * `undefined`, `{}`, and `{ params: { query: { after: undefined } } }` all
 * sanitize to the same value and therefore share a cache entry.
 */
export function sanitizeQueryInit(init: unknown): SanitizedQueryInit {
  if (!isPlainObject(init)) return {};

  const params = isPlainObject(init.params) ? init.params : undefined;
  const sanitized: SanitizedQueryInit = {};

  const path = canonicalizeRecord(params?.path);
  if (path) sanitized.path = path;

  const query = canonicalizeRecord(params?.query);
  if (query) sanitized.query = query;

  const body = canonicalizeQueryKeyValue(init.body);
  if (body !== undefined) sanitized.body = body;

  return sanitized;
}

/** Builds the untyped `[method, path, sanitized(init)]` key. */
export function buildQueryApiKey<TMethod extends string, TPath extends string>(
  method: TMethod,
  path: TPath,
  init?: unknown,
): QueryApiKey<TMethod, TPath> {
  return [method, path, sanitizeQueryInit(init)];
}

/** The `${method} ${path}` token an endpoint is registered and matched under. */
export function operationToken(method: string, path: string): string {
  return `${method} ${path}`;
}
