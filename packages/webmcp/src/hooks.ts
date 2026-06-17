/* eslint-disable no-underscore-dangle -- the registry exposes internal-by-convention methods (_addSpec, _contributeViewState) that these public hooks wrap. */
/**
 * Public hooks for @archon-research/webmcp.
 *
 * All hooks require <WebMCPProvider> in the component tree.
 * None of them import @mcp-b/* directly, that coupling lives in provider.tsx.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type DependencyList,
} from 'react';

import { useToolRegistryContext } from './provider.js';
import { acquireToolRegistration } from './registration.js';
import type { ToolSpec, ViewState } from './types.js';

// ---------------------------------------------------------------------------
// useRegisterTool
// ---------------------------------------------------------------------------

/**
 * Register a tool while the calling component is mounted.
 *
 * Registers the tool into `document.modelContext` (via the @mcp-b/global
 * polyfill) so it is exposed to any connected harness, AND registers the spec
 * in the local ToolRegistry so `listTools()` / `getViewState()` see it.
 *
 * @example
 * ```tsx
 * import { defineTool, useRegisterTool } from '@archon-research/webmcp';
 *
 * const selectIdentityTool = defineTool({
 *   name: 'explorer.selectIdentity',
 *   description: 'Select and focus an identity node in the Explorer.',
 *   schema: {
 *     type: 'object',
 *     properties: { identityId: { type: 'string' } },
 *     required: ['identityId'],
 *   },
 *   handler: async ({ identityId }) => {
 *     // drive explorer state here
 *     return { selected: identityId };
 *   },
 * });
 *
 * function IdentityGraph() {
 *   useRegisterTool(selectIdentityTool);
 *   return <Graph />;
 * }
 * ```
 *
 * @param spec - The tool definition created via `defineTool(...)`.
 * @param deps - Optional dependency array.  When values change the tool is
 *   re-registered.  Pass the same deps you would pass to `useEffect`.
 */
export function useRegisterTool<
  TArgs = Record<string, unknown>,
  TResult = unknown,
>(spec: ToolSpec<TArgs, TResult>, deps?: DependencyList) {
  const registry = useToolRegistryContext();

  // `deps` is accepted for API familiarity, but registration intentionally does
  // NOT re-run when deps change. Callers (e.g. the Explorer) build specs from
  // unstable values (inline callbacks, freshly-derived maps) every render; if
  // the registration effects depended on those, they would re-run each render,
  // and the registry's bump()/setState would loop ("Maximum update depth").
  // Instead we register once per tool name and read the latest handler/spec
  // through a ref, so handlers always see current state without re-registering.
  void deps;
  const specRef = useRef(spec);
  specRef.current = spec;

  // A stable spec object (per tool name) whose fields delegate to the latest
  // spec via specRef. Re-renders update specRef.current; this object identity
  // stays constant so the effects below only run on mount / name change.
  const stableSpec = useMemo<ToolSpec>(
    () =>
      ({
        get name() {
          return specRef.current.name;
        },
        get description() {
          return specRef.current.description;
        },
        get schema() {
          return specRef.current.schema;
        },
        get mutation() {
          return specRef.current.mutation;
        },
        get confirmationSummary() {
          return (specRef.current as ToolSpec).confirmationSummary;
        },
        handler: (args: never) => specRef.current.handler(args),
      }) as unknown as ToolSpec,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spec.name],
  );

  // Register in the local ToolRegistry so listTools() sees it.
  useEffect(() => {
    return registry._addSpec(stableSpec);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec.name]);

  // Register with document.modelContext through our StrictMode-safe manager
  // (see registration.ts). We deliberately do not use @mcp-b's useWebMCP here:
  // its effect re-runs under StrictMode in a way that races the polyfill's
  // microtask-synced McpServer and throws "Tool <name> is already registered".
  // The manager registers each name once, refcounted, with AbortSignal-based
  // unregister.
  useEffect(() => {
    return acquireToolRegistration(stableSpec);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec.name]);
}

// ---------------------------------------------------------------------------
// useTool
// ---------------------------------------------------------------------------

/**
 * Access the execution state of a previously-registered tool by name.
 *
 * Returns `null` if no tool with that name is registered.
 *
 * Useful for components that want to observe tool activity (e.g., showing a
 * loading spinner while `explorer.switchBranch` is executing) without owning
 * the registration themselves.
 */
export function useTool(toolName: string): ToolSpec | null {
  const registry = useToolRegistryContext();
  return registry.tools.find((t) => t.name === toolName) ?? null;
}

// ---------------------------------------------------------------------------
// useToolRegistry
// ---------------------------------------------------------------------------

/**
 * Read-only view of the whole tool registry.
 *
 * @returns
 *   - `tools` - live snapshot of all currently-registered tool specs
 *   - `listTools()` - stable function returning the same snapshot
 *   - `getViewState()` - aggregated view state from all contributors
 *
 * @example
 * ```tsx
 * function ConnectHarnessPanel() {
 *   const { tools, getViewState } = useToolRegistry();
 *   return <pre>{JSON.stringify({ count: tools.length, state: getViewState() }, null, 2)}</pre>;
 * }
 * ```
 */
export function useToolRegistry() {
  const registry = useToolRegistryContext();
  return {
    tools: registry.tools,
    listTools: registry.listTools,
    getViewState: registry.getViewState,
  };
}

// ---------------------------------------------------------------------------
// useContributeViewState
// ---------------------------------------------------------------------------

/**
 * Contribute a partial view-state slice while the calling component is mounted.
 *
 * The slice is merged into the object returned by `getViewState()`.
 * On unmount the contribution is removed.
 *
 * @example
 * ```tsx
 * function BranchSelector({ selectedBranch }: { selectedBranch: string }) {
 *   useContributeViewState({ selectedBranch });
 *   return <select>...</select>;
 * }
 * ```
 */
export function useContributeViewState(
  partial: ViewState,
  deps?: DependencyList,
) {
  const registry = useToolRegistryContext();
  const contribute = registry._contributeViewState;

  useEffect(
    () => {
      return contribute(partial);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps ?? Object.values(partial),
  );
}

// ---------------------------------------------------------------------------
// Convenience re-export: listTools / getViewState as standalone functions
// ---------------------------------------------------------------------------

/**
 * Imperative accessor for the list of currently-registered tools.
 *
 * For use outside React components (e.g., WebSocket relay handlers that need
 * to push a fresh `tools/list` message to the server).  Requires a registry
 * instance obtained from `useToolRegistry()` or direct context access.
 *
 * @example
 * ```ts
 * const registry = getRegistryFromContext(ctx);
 * const tools = listTools(registry);
 * ws.send(JSON.stringify({ type: 'tools/list', tools: toWireFormat(tools) }));
 * ```
 */
export function listTools(registry: {
  listTools: () => ToolSpec[];
}): ToolSpec[] {
  return registry.listTools();
}

/**
 * Imperative accessor for the aggregated view state.
 */
export function getViewState(registry: {
  getViewState: () => ViewState;
}): ViewState {
  return registry.getViewState();
}

// Typed callback helper used by the WebSocket session hook (Phase 2).
export type ToolRegistryRef = {
  listTools: () => ToolSpec[];
  getViewState: () => ViewState;
};

/**
 * Returns a stable ref-shaped object pointing at the registry's imperative
 * methods.  Useful to pass to non-React code (e.g., the WebSocket session
 * handler) without causing re-renders.
 */
export function useToolRegistryRef(): ToolRegistryRef {
  const registry = useToolRegistryContext();
  return useCallback(
    () => ({
      listTools: registry.listTools,
      getViewState: registry.getViewState,
    }),
    [registry.listTools, registry.getViewState],
  )();
}
