/* eslint-disable no-underscore-dangle -- the registry exposes internal-by-convention methods (_addSpec, _contributeViewState) that the public hooks wrap. */
import {
  cleanupWebModelContext,
  initializeWebModelContext,
} from '@mcp-b/global';
import { useWebMCP } from '@mcp-b/react-webmcp';
/**
 * WebMCPProvider
 *
 * Wraps @mcp-b/global initialization (installs the document.modelContext
 * polyfill) and exposes a ToolRegistryContext so that useRegisterTool /
 * useToolRegistry hooks can work together without redundant polyfill calls.
 *
 * Absorbs @mcp-b churn: callers never import @mcp-b/* directly.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type DependencyList,
  type ReactNode,
} from 'react';

import type { ToolSpec, ViewState } from './types.js';

// ---------------------------------------------------------------------------
// ToolRegistryContext
// ---------------------------------------------------------------------------

/**
 * Internal registry kept by the provider so `listTools` and `getViewState`
 * have something to read synchronously.
 *
 * Registration is additive: each `useRegisterTool` call pushes its spec into
 * the registry while mounted and removes it on unmount.
 */
export interface ToolRegistryContextValue {
  /**
   * Snapshot of all currently-registered tool specs.
   * Re-computed whenever any tool mounts or unmounts.
   */
  tools: ToolSpec[];

  /**
   * Returns a snapshot of every registered tool spec at call time.
   */
  listTools: () => ToolSpec[];

  /**
   * Returns the current view state aggregated from all registered context
   * contributions.  Starts empty; components hydrate it via setViewState.
   */
  getViewState: () => ViewState;

  /**
   * Called by hooks to add a spec to the registry.
   * Returns a cleanup function that removes it.
   */
  _addSpec: (spec: ToolSpec) => () => void;

  /**
   * Called by view-state contributor hooks to merge partial state.
   * Returns a cleanup function that removes the contribution.
   */
  _contributeViewState: (partial: ViewState) => () => void;
}

const ToolRegistryContext = createContext<ToolRegistryContextValue | null>(
  null,
);

// ---------------------------------------------------------------------------
// WebMCPProvider
// ---------------------------------------------------------------------------

export interface WebMCPProviderProps {
  children: ReactNode;
  /**
   * Pass `false` to skip polyfill initialization (useful in tests or SSR).
   * @default true
   */
  initPolyfill?: boolean;
}

/**
 * Mount this provider once near the root of your React tree before using
 * any hooks from @synome/web-mcp.
 *
 * @example
 * ```tsx
 * import { WebMCPProvider } from '@synome/web-mcp';
 *
 * function App() {
 *   return (
 *     <WebMCPProvider>
 *       <Explorer />
 *     </WebMCPProvider>
 *   );
 * }
 * ```
 */
export function WebMCPProvider({
  children,
  initPolyfill = true,
}: WebMCPProviderProps) {
  // Stable refs so the context value object is referentially stable.
  const toolMapRef = useRef<Map<string, ToolSpec>>(new Map());
  const viewStateRef = useRef<Map<string, ViewState>>(new Map());
  // Counter used to re-render consumers when the registry changes.
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  // Initialize the document.modelContext polyfill on mount.
  useEffect(() => {
    if (!initPolyfill) return;
    initializeWebModelContext({ autoInitialize: true });
    return () => {
      cleanupWebModelContext();
    };
  }, [initPolyfill]);

  const _addSpec = useCallback(
    (spec: ToolSpec): (() => void) => {
      toolMapRef.current.set(spec.name, spec);
      bump();
      return () => {
        toolMapRef.current.delete(spec.name);
        bump();
      };
    },
    [bump],
  );

  const _contributeViewState = useCallback(
    (partial: ViewState): (() => void) => {
      // Use object identity as key.
      const key = Math.random().toString(36).slice(2);
      viewStateRef.current.set(key, partial);
      return () => {
        viewStateRef.current.delete(key);
      };
    },
    [],
  );

  const listTools = useCallback((): ToolSpec[] => {
    return Array.from(toolMapRef.current.values());
  }, []);

  const getViewState = useCallback((): ViewState => {
    const merged: ViewState = {};
    for (const partial of viewStateRef.current.values()) {
      Object.assign(merged, partial);
    }
    return merged;
  }, []);

  // Rebuild snapshot every time the registry changes so consumers can subscribe.
  const tools = Array.from(toolMapRef.current.values());

  const value: ToolRegistryContextValue = {
    tools,
    listTools,
    getViewState,
    _addSpec,
    _contributeViewState,
  };

  return (
    <ToolRegistryContext.Provider value={value}>
      {children}
    </ToolRegistryContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Internal hook to access the registry context (throws if not mounted)
// ---------------------------------------------------------------------------

export function useToolRegistryContext(): ToolRegistryContextValue {
  const ctx = useContext(ToolRegistryContext);
  if (!ctx) {
    throw new Error(
      '[web-mcp] useToolRegistryContext called outside <WebMCPProvider>. ' +
        'Wrap your app (or at least the component tree that uses @synome/web-mcp hooks) ' +
        'with <WebMCPProvider>.',
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Re-export the raw useWebMCP hook for advanced use within this package
// ---------------------------------------------------------------------------

export { useWebMCP };
export type { DependencyList };
