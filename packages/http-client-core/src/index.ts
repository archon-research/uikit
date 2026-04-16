import createClient from 'openapi-fetch';
import { z } from 'zod';

export type JsonSchema = z.core.JSONSchema.JSONSchema;

export const createApiClient = <TPaths extends {}>(baseUrl: string = '/') => {
  return createClient<TPaths>({ baseUrl });
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
        normalized[key] = entryValue.replace('#/components/schemas/', '#/$defs/');
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
  const defs = normalizeOpenApiRefs(
    schema.components?.schemas ?? {},
  ) as Record<string, JsonSchema>;

  return z.fromJSONSchema({
    $ref: `#/$defs/${name}`,
    $defs: defs,
  } satisfies JsonSchema);
}
