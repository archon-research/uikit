/**
 * StrictMode-safe tool registration against the WebMCP polyfill.
 *
 * Why this exists: the pinned `@mcp-b` polyfill bridges `document.modelContext`
 * (a Map with AbortSignal-based unregister) to an underlying McpServer whose
 * `_registeredTools` is synced via `queueMicrotask`. React StrictMode mounts
 * effects mount -> unmount -> mount synchronously, which races that microtask
 * sync and makes the McpServer throw `Tool <name> is already registered`,
 * crashing the app in dev. (This is the kind of @mcp-b churn the wrapper is
 * meant to absorb; see decision 8 / the plan's section 8.)
 *
 * The fix: register each tool name exactly once, refcounted. A transient
 * unmount/remount in the same tick re-acquires the existing registration
 * instead of abort+re-add, so the polyfill never sees a duplicate. The real
 * unregister (signal abort) only fires once the last holder is gone, deferred
 * to a microtask so a StrictMode remount can cancel it.
 */
import type { ToolSpec } from './types.js';

type ModelContext = {
  registerTool: (
    tool: Record<string, unknown>,
    options?: { signal?: AbortSignal },
  ) => unknown;
};

type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

type Entry = {
  count: number;
  controller: AbortController;
  // Latest spec, so re-acquiring with new deps swaps the handler in place
  // without re-registering (which the polyfill would reject as a duplicate).
  spec: ToolSpec;
};

const REGISTRY = new Map<string, Entry>();

/** Resolve the polyfilled model context, preferring the current draft location. */
function getModelContext(): ModelContext | undefined {
  if (typeof window === 'undefined') return undefined;
  const doc = window.document as unknown as { modelContext?: ModelContext };
  const nav = window.navigator as unknown as { modelContext?: ModelContext };
  return doc?.modelContext ?? nav?.modelContext;
}

function stringify(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

/**
 * Acquire a registration for `spec`. Returns a release function to call on
 * unmount. Idempotent per tool name: concurrent holders share one underlying
 * polyfill registration.
 */
export function acquireToolRegistration(spec: ToolSpec): () => void {
  const existing = REGISTRY.get(spec.name);
  if (existing) {
    existing.count += 1;
    existing.spec = spec; // keep the freshest handler/description
    return makeRelease(spec.name);
  }

  const controller = new AbortController();
  const entry: Entry = { count: 1, controller, spec };
  REGISTRY.set(spec.name, entry);

  const modelContext = getModelContext();
  if (!modelContext) {
    // No polyfill (SSR / unsupported browser): keep the refcount bookkeeping so
    // listTools()-style local state still balances, but skip the global call.
    return makeRelease(spec.name);
  }

  const execute = async (
    args: Record<string, unknown>,
  ): Promise<ToolResult> => {
    try {
      // Read the latest spec so deps-driven handler updates take effect without
      // re-registering against the polyfill.
      const current = REGISTRY.get(spec.name)?.spec ?? spec;
      const result = await current.handler(args as never);
      return { content: [{ type: 'text', text: stringify(result) }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Error: ${message}` }],
        isError: true,
      };
    }
  };

  try {
    modelContext.registerTool(
      {
        name: spec.name,
        description: spec.description,
        inputSchema: spec.schema,
        ...(spec.mutation ? { annotations: { destructiveHint: true } } : {}),
        execute,
      },
      { signal: controller.signal },
    );
  } catch (error) {
    // Defensive: if the polyfill still reports a duplicate (e.g. a stale
    // registration from a prior race), treat it as already-present rather than
    // crashing the app. The existing registration stays usable.
    if (!/already registered/i.test(String(error))) {
      REGISTRY.delete(spec.name);
      throw error;
    }
  }

  return makeRelease(spec.name);
}

function makeRelease(name: string): () => void {
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const entry = REGISTRY.get(name);
    if (!entry) return;
    entry.count -= 1;
    if (entry.count > 0) return;
    // Defer the abort so a StrictMode remount in the same tick can re-acquire
    // (bumping count back above zero) and cancel the teardown.
    queueMicrotask(() => {
      const current = REGISTRY.get(name);
      if (current && current.count === 0) {
        current.controller.abort();
        REGISTRY.delete(name);
      }
    });
  };
}
