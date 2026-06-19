/**
 * @archon-research/mcp-relay
 *
 * Host-agnostic core for the WebMCP relay protocol.
 * Zero I/O, zero transport: pure state machine + JWT helpers.
 * Works in Cloudflare Workers, Node >= 19, and browser environments.
 */

export * from './protocol.js';
export * from './tokens.js';
export * from './session.js';
