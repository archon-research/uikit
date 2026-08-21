import { getComponentSchemaFromOpenApi } from '@archon-research/http-client-core';

import type {
  QueryApiMiddleware,
  QueryApiRequestContext,
} from './middleware.js';
import { operationToken } from './query-key.js';

/** A single schema violation, flattened so consumers never touch zod's types. */
export type ResponseValidationIssue = {
  /** Dot-joined path to the offending value, `''` at the root. */
  path: string;
  message: string;
};

/** Thrown when a response body does not match its OpenAPI component schema. */
export class ZodResponseValidationError extends Error {
  readonly name = 'ZodResponseValidationError';
  readonly method: string;
  readonly path: string;
  /** The `components.schemas` name the body was validated against. */
  readonly schemaName: string;
  readonly issues: readonly ResponseValidationIssue[];

  constructor(init: {
    method: string;
    path: string;
    schemaName: string;
    issues: readonly ResponseValidationIssue[];
    cause?: unknown;
  }) {
    super(
      `${init.method.toUpperCase()} ${init.path} response failed ${init.schemaName} validation: ${init.issues
        .map((issue) => `${issue.path || '<root>'} ${issue.message}`)
        .join('; ')}`,
      { cause: init.cause },
    );
    this.method = init.method;
    this.path = init.path;
    this.schemaName = init.schemaName;
    this.issues = init.issues;
  }
}

/**
 * How to find the component schema for an operation: either a lookup table
 * keyed `${method} ${path}` (`'get /users/{id}'`), or a function for specs
 * whose naming is derivable.
 */
export type ResponseSchemaSource =
  | Readonly<Record<string, string>>
  | ((ctx: QueryApiRequestContext) => string | undefined);

export type ZodResponseMiddlewareOptions = {
  /** The parsed OpenAPI document the `TPaths` types were generated from. */
  document: unknown;
  schemas: ResponseSchemaSource;
  /**
   * Called instead of throwing when a body fails validation. Use it to report
   * drift without breaking the screen; the unmodified body is passed through.
   */
  onInvalid?: (error: ZodResponseValidationError) => void;
};

function normalizeIssues(error: unknown): readonly ResponseValidationIssue[] {
  const issues = (error as { issues?: unknown } | undefined)?.issues;
  if (!Array.isArray(issues)) return [];

  return issues.map((issue: unknown) => {
    const entry = issue as { path?: unknown; message?: unknown };
    const path = Array.isArray(entry.path) ? entry.path.join('.') : '';
    return {
      path,
      message: typeof entry.message === 'string' ? entry.message : 'invalid',
    };
  });
}

/**
 * Validates response bodies against the OpenAPI document at runtime, reusing
 * `getComponentSchemaFromOpenApi` from http-client-core so the schema and the
 * `TPaths` types come from the same spec.
 *
 * The validated body is passed through **unmodified** — the middleware never
 * substitutes zod's parse output, so the runtime value always matches the
 * statically inferred one and no coercion happens behind the caller's back.
 *
 * Compiled schemas are memoized per middleware instance;
 * `z.fromJSONSchema` is far too expensive to run per request.
 */
export function createZodResponseMiddleware(
  options: ZodResponseMiddlewareOptions,
): QueryApiMiddleware {
  const { document, schemas, onInvalid } = options;
  const compiled = new Map<
    string,
    ReturnType<typeof getComponentSchemaFromOpenApi>
  >();

  const resolveSchemaName = (
    ctx: QueryApiRequestContext,
  ): string | undefined => {
    if (typeof schemas === 'function') return schemas(ctx);
    return schemas[operationToken(ctx.method, ctx.path)];
  };

  return async (ctx, next) => {
    const data = await next();
    const schemaName = resolveSchemaName(ctx);
    if (!schemaName) return data;

    let schema = compiled.get(schemaName);
    if (!schema) {
      schema = getComponentSchemaFromOpenApi(document, schemaName);
      compiled.set(schemaName, schema);
    }

    const result = schema.safeParse(data);
    if (result.success) return data;

    const error = new ZodResponseValidationError({
      method: ctx.method,
      path: ctx.path,
      schemaName,
      issues: normalizeIssues(result.error),
      cause: result.error,
    });

    if (onInvalid) {
      onInvalid(error);
      return data;
    }

    throw error;
  };
}
