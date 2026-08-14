/**
 * Test-only fixtures. Excluded from `tsconfig.build.json` alongside the specs,
 * so nothing here ships, but still covered by `type:check` — which matters,
 * because `TestPaths` mirrors `openapi-typescript` output closely enough
 * (every HTTP method present, absent ones as `?: never`) to prove the query
 * layer's inference against a real generated `paths` type.
 */

export type User = { id: string; name: string };
export type ApiFault = { message: string };
export type ValidationFault = { message: string; field: string };

type NoBody = { requestBody?: never };
type NoParams = {
  query?: never;
  header?: never;
  path?: never;
  cookie?: never;
};

export type TestPaths = {
  '/users': {
    parameters: NoParams;
    get: NoBody & {
      parameters: {
        query?: { limit?: number; search?: string };
        header?: never;
        path?: never;
        cookie?: never;
      };
      responses: {
        200: {
          headers: Record<string, unknown>;
          content: {
            'application/json': User[];
          };
        };
        500: {
          headers: Record<string, unknown>;
          content: {
            'application/json': ApiFault;
          };
        };
      };
    };
    post: {
      parameters: NoParams;
      requestBody: { content: { 'application/json': { name: string } } };
      responses: {
        201: {
          headers: Record<string, unknown>;
          content: {
            'application/json': User;
          };
        };
        422: {
          headers: Record<string, unknown>;
          content: {
            'application/json': ValidationFault;
          };
        };
      };
    };
    put?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/users/{id}': {
    parameters: NoParams;
    get: NoBody & {
      parameters: {
        query?: { expand?: string };
        header?: never;
        path: { id: string };
        cookie?: never;
      };
      responses: {
        200: {
          headers: Record<string, unknown>;
          content: {
            'application/json': User;
          };
        };
        404: {
          headers: Record<string, unknown>;
          content: {
            'application/json': ApiFault;
          };
        };
      };
    };
    delete: NoBody & {
      parameters: {
        query?: never;
        header?: never;
        path: { id: string };
        cookie?: never;
      };
      responses: {
        204: { headers: Record<string, unknown>; content?: never };
        404: {
          headers: Record<string, unknown>;
          content: {
            'application/json': ApiFault;
          };
        };
      };
    };
    put?: never;
    post?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
};

export type TestTag = 'users' | 'user';

export type RecordedRequest = { method: string; url: string; body?: string };

/**
 * A `fetch` stand-in for `createApiClient`'s client options. Routes are matched
 * on `${method} ${pathname}` so the specs exercise the real `openapi-fetch`
 * path and query serialization rather than a hand-faked client object.
 */
export function createFetchStub(
  routes: Record<
    string,
    (request: Request, url: URL) => Response | Promise<Response>
  >,
): {
  fetch: (request: Request) => Promise<Response>;
  requests: RecordedRequest[];
} {
  const requests: RecordedRequest[] = [];

  return {
    requests,
    fetch: async (request) => {
      const url = new URL(request.url);
      requests.push({
        method: request.method,
        url: `${url.pathname}${url.search}`,
        body: request.body ? await request.clone().text() : undefined,
      });

      const route = routes[`${request.method} ${url.pathname}`];
      if (!route) {
        return new Response(JSON.stringify({ message: 'no stub route' }), {
          status: 501,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return route(request, url);
    },
  };
}

/** A 2xx JSON response. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** A no-content response, for the 204 branch of the query function. */
export function emptyResponse(status = 204): Response {
  return new Response(null, { status });
}
