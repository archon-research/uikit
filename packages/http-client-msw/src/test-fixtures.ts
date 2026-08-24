/**
 * Test-only fixtures. Excluded from `tsconfig.build.json` alongside the specs,
 * so nothing here ships, but still covered by `type:check` — which matters,
 * because `TestPaths` mirrors `openapi-typescript` output closely enough (every
 * HTTP method present, absent ones as `?: never`, no-content responses as
 * `content?: never`) to prove the handler factory's inference against a real
 * generated `paths` type.
 */

export type Thing = { id: string; name: string; size: number };
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
  '/things': {
    parameters: NoParams;
    get: NoBody & {
      parameters: {
        query?: { limit?: number; tag?: string[] };
        header?: never;
        path?: never;
        cookie?: never;
      };
      responses: {
        200: {
          headers: Record<string, unknown>;
          content: { 'application/json': Thing[] };
        };
        500: {
          headers: Record<string, unknown>;
          content: { 'application/json': ApiFault };
        };
      };
    };
    post: {
      parameters: NoParams;
      requestBody: {
        content: { 'application/json': { name: string; size: number } };
      };
      responses: {
        201: {
          headers: Record<string, unknown>;
          content: { 'application/json': Thing };
        };
        422: {
          headers: Record<string, unknown>;
          content: { 'application/json': ValidationFault };
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
  '/things/{id}': {
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
          content: { 'application/json': Thing };
        };
        404: {
          headers: Record<string, unknown>;
          content: { 'application/json': ApiFault };
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
          content: { 'application/json': ApiFault };
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

export const seedThings = (): Thing[] => [
  { id: 't1', name: 'First', size: 1 },
  { id: 't2', name: 'Second', size: 2 },
];
