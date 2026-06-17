/**
 * Tool-definition contract for @archon-research/webmcp.
 *
 * Mirrors the Python ToolSpec / define_tool idiom in the relay core
 * (schema-first authoring shape).
 *
 * Usage:
 *
 *   import { defineTool } from '@archon-research/webmcp';
 *
 *   const selectIdentity = defineTool({
 *     name: 'explorer.selectIdentity',
 *     description: 'Select and focus an identity node in the Explorer.',
 *     schema: {
 *       type: 'object',
 *       properties: { identityId: { type: 'string' } },
 *       required: ['identityId'],
 *     },
 *     handler: async ({ identityId }) => { ... },
 *   });
 */

import type { ToolInputSchema } from './protocol.js';

// ---------------------------------------------------------------------------
// Tool-definition contract
// ---------------------------------------------------------------------------

export type ToolHandler<TArgs = Record<string, unknown>, TResult = unknown> = (
  args: TArgs,
) => Promise<TResult> | TResult;

export interface ToolSpec<TArgs = Record<string, unknown>, TResult = unknown> {
  /** Namespaced tool name, e.g. "explorer.selectIdentity". */
  name: string;
  description: string;
  schema: ToolInputSchema;
  handler: ToolHandler<TArgs, TResult>;
  /** True for any tool that mutates state. Triggers human-in-the-loop confirmation. */
  mutation?: boolean;
  /**
   * Returns a one-sentence plain-English summary shown in the confirmation dialog.
   * Required when mutation is true.
   */
  confirmationSummary?: (args: TArgs) => string;
}

/**
 * Define a tool using the schema-first idiom.
 *
 * This is a pass-through factory; the returned value is the same object.
 * It exists to provide type inference on the handler args and to make tool
 * definitions self-documenting at the call site.
 */
export function defineTool<TArgs = Record<string, unknown>, TResult = unknown>(
  spec: ToolSpec<TArgs, TResult>,
): ToolSpec<TArgs, TResult> {
  return spec;
}

// ---------------------------------------------------------------------------
// Registry interface (implemented in Phase 1 by WebMCPProvider)
// ---------------------------------------------------------------------------

export interface ViewState {
  selectedIdentityId?: string;
  selectedContentUuid?: string;
  selectedBranch?: string;
  mode?: string;
  [key: string]: unknown;
}

export interface ToolRegistry {
  registerTool: <TArgs = Record<string, unknown>, TResult = unknown>(
    spec: ToolSpec<TArgs, TResult>,
  ) => () => void;
  listTools: () => ToolSpec[];
  getViewState: () => ViewState;
}

// ---------------------------------------------------------------------------
// Pending-call confirmation (shared between server push and browser UI)
// ---------------------------------------------------------------------------

export interface PendingCall {
  callId: string;
  toolName: string;
  summary: string;
  argsPreview: Record<string, unknown>;
  expiresAt: string;
}
