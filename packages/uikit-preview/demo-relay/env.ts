/**
 * Worker + Durable Object environment bindings (shared by worker.ts and
 * session-do.ts to avoid a circular import).
 */
export interface Env {
  SESSION_DO: DurableObjectNamespace;
  WEBMCP_RELAY_JWT_SECRET: string;
  /**
   * Comma-separated list of origins allowed to call /api/sessions and /mcp via
   * CORS. Set in wrangler.toml [vars] to the stable Pages origin in production.
   * When unset (e.g. local `wrangler dev`), CORS falls back to "*".
   */
  ALLOWED_ORIGINS?: string;
}
