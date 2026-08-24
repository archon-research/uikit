import createClient from 'openapi-fetch';
import type { ClientOptions } from 'openapi-fetch';
import { z } from 'zod';

/**
 * The `openapi-fetch` / `openapi-typescript` helper types that anything built
 * on this client needs. They are re-exported here so downstream packages
 * (`http-client-react` and `http-client-msw`) type against the same helper
 * versions this package is pinned to, rather than each declaring its own
 * dependency on the OpenAPI toolchain.
 */
export type {
  Client as ApiClient,
  ClientOptions as ApiClientOptions,
  FetchResponse,
  MaybeOptionalInit,
} from 'openapi-fetch';
export type {
  HttpMethod,
  MediaType,
  PathsWithMethod,
  RequiredKeysOf,
} from 'openapi-typescript-helpers';

export type JsonSchema = z.core.JSONSchema.JSONSchema;

/**
 * `options` is the full `openapi-fetch` client config minus `baseUrl`, which
 * stays the first positional argument for backwards compatibility. It is what
 * lets a test or a mock layer inject its own `fetch`.
 */
export const createApiClient = <TPaths extends {}>(
  baseUrl: string = '/',
  options?: Omit<ClientOptions, 'baseUrl'>,
) => {
  return createClient<TPaths>({ ...options, baseUrl });
};

export function normalizeOpenApiRefs(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeOpenApiRefs);
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};

    for (const [key, entryValue] of Object.entries(record)) {
      if (key === '$ref' && typeof entryValue === 'string') {
        normalized[key] = entryValue.replace(
          '#/components/schemas/',
          '#/$defs/',
        );
      } else {
        normalized[key] = normalizeOpenApiRefs(entryValue);
      }
    }

    return normalized;
  }

  return value;
}

export function getComponentSchemaFromOpenApi(
  openApi: unknown,
  name: string,
): z.ZodType {
  const schema = openApi as {
    components?: { schemas?: Record<string, unknown> };
  };
  const defs = normalizeOpenApiRefs(schema.components?.schemas ?? {}) as Record<
    string,
    JsonSchema
  >;

  return z.fromJSONSchema({
    $ref: `#/$defs/${name}`,
    $defs: defs,
  } satisfies JsonSchema);
}
