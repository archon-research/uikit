/**
 * `openapi-fetch` resolves both outcomes of a request into `{ data, error }`,
 * so a 404 is a fulfilled promise. TanStack Query only treats a *rejected*
 * query function as a failure, so the query layer has to convert one into the
 * other. This is the carrier for that conversion: it keeps the HTTP status and
 * the parsed error body instead of flattening the failure to a message string.
 */
export class HttpRequestError<TBody = unknown> extends Error {
  readonly name = 'HttpRequestError';
  /** Lowercase OpenAPI method (`get`, `post`, …) that failed. */
  readonly method: string;
  /** The OpenAPI path template, braces intact (`/users/{id}`). */
  readonly path: string;
  readonly status: number;
  readonly statusText: string;
  /**
   * The response body parsed by `openapi-fetch`, typed from the operation's
   * error responses — and `| undefined`, because a failure need not have one: a
   * 5xx from a proxy, or any non-2xx with an empty body, leaves nothing to
   * parse. Declaring it as `TBody` alone would let a consumer read through to a
   * property of a body that is not there.
   */
  readonly body: TBody | undefined;
  readonly response: Response;

  constructor(init: {
    method: string;
    path: string;
    body: TBody | undefined;
    response: Response;
  }) {
    super(
      `${init.method.toUpperCase()} ${init.path} failed with status ${init.response.status}`,
    );
    this.method = init.method;
    this.path = init.path;
    this.status = init.response.status;
    this.statusText = init.response.statusText;
    this.body = init.body;
    this.response = init.response;
  }
}

/**
 * Narrows a caught value to {@link HttpRequestError}.
 *
 * Matches on `name` rather than `instanceof` so the guard still holds when a
 * consumer ends up with two copies of this package in its module graph (a
 * bundled app plus a linked workspace build, for instance).
 */
export function isHttpRequestError<TBody = unknown>(
  value: unknown,
): value is HttpRequestError<TBody> {
  return value instanceof Error && value.name === 'HttpRequestError';
}
