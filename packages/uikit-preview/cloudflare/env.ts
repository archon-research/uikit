/**
 * Worker + Durable Object environment bindings (shared by worker.ts and
 * session-do.ts to avoid a circular import).
 */
export interface Env {
  SESSION_DO: DurableObjectNamespace;
  WEBMCP_RELAY_JWT_SECRET: string;
}
