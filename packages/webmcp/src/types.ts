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
  // Enforce the cross-field invariant the type system can't express cleanly:
  // a mutation must carry a confirmationSummary, otherwise the human-in-the-loop
  // dialog would have nothing to show. Fail loudly at authoring time.
  if (spec.mutation && !spec.confirmationSummary) {
    throw new Error(
      `defineTool("${spec.name}"): a tool with mutation:true must provide a confirmationSummary.`,
    );
  }
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
// Pending-call confirmation prompt (input shape for a browser confirmation UI)
// ---------------------------------------------------------------------------

/**
 * A mutation awaiting approval, as the browser-side UI needs to render it.
 *
 * Named `PendingCallPrompt` (not `PendingCall`) to avoid colliding with
 * `@archon-research/mcp-connect`'s richer `PendingCallRecord`, which carries
 * lifecycle status. This shape is the minimal prompt: what the dialog displays.
 */
export interface PendingCallPrompt {
  callId: string;
  toolName: string;
  summary: string;
  argsPreview: Record<string, unknown>;
  /** ISO-8601 timestamp when the prompt was raised (for the countdown bar). */
  createdAt: string;
  expiresAt: string;
}
