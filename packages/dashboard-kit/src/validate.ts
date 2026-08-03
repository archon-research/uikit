/**
 * Manifest validation — the gate that must land before any "an agent or
 * command bar submits a manifest patch" feature can trust a `DashboardSpec`.
 *
 * Two layers, because zod alone can't catch the interesting failures:
 *
 *   1. STRUCTURAL — `dashboardSpecSchema` below. Shape, enums, required
 *      fields, no malformed widget nodes.
 *   2. REFERENTIAL — {@link validateDashboardSpec}'s extra passes. Every
 *      `layout` leaf must name a widget that exists; every widget must be
 *      reachable from the layout; a resizable `column` split must carry a
 *      `height`; an `agentWritable` key must actually be writable. These are
 *      the mistakes an agent-authored patch actually makes, and none of them
 *      are expressible as a type.
 *
 * `zod` deliberately does NOT validate `component` against a registry here:
 * `schema.ts` is the data contract and a registry is one possible resolution
 * of it. The renderer degrades gracefully on an unknown component key (it
 * renders an `UnknownWidget` marker), and coupling the two would make the
 * schema un-shareable. {@link validateDashboardSpec} takes an optional set of
 * known component keys for callers who DO want that checked.
 */

import { z } from 'zod';

import type { DashboardSpec } from './schema.js';

const layoutDirection = z.enum(['row', 'column']);

const widgetLayoutNode = z.object({
  type: z.literal('widget'),
  ref: z.string().min(1),
  size: z.number().positive().optional(),
});

/**
 * Recursive by `z.lazy` — a split's children are layout nodes, which may be
 * splits.
 */
const layoutNode: z.ZodType<unknown> = z.lazy(() =>
  z.union([widgetLayoutNode, splitLayoutNode]),
);

const splitLayoutNode = z.object({
  type: z.literal('split'),
  direction: layoutDirection,
  size: z.number().positive().optional(),
  resizable: z.boolean().optional(),
  height: z.string().min(1).optional(),
  children: z.array(layoutNode).min(1),
});

const dataBinding = z.object({
  source: z.string().min(1),
  fields: z.record(z.string(), z.string()),
});

const widgetInteraction = z.object({
  reads: z.array(z.string().min(1)).optional(),
  writes: z.array(z.string().min(1)).optional(),
  agentWritable: z.array(z.string().min(1)).optional(),
});

const thresholdRule = z.object({
  op: z.enum(['gte', 'lte', 'gt', 'lt', 'eq']),
  value: z.number(),
  severity: z.enum(['success', 'warning', 'critical']),
});

const widgetTableColumn = z.object({
  accessorKey: z.string().min(1),
  header: z.string(),
  render: z
    .enum(['text', 'number', 'currency', 'percent', 'badge', 'sparkline'])
    .optional(),
});

const widgetNode = z.object({
  id: z.string().min(1),
  component: z.string().min(1),
  title: z.string().optional(),
  // `props` stays open (it's per-component config) EXCEPT `columns`, which is
  // structured enough — and mistyped often enough — to be worth checking.
  props: z
    .looseObject({ columns: z.array(widgetTableColumn).optional() })
    .optional(),
  dataBinding: dataBinding.optional(),
  interaction: widgetInteraction.optional(),
  thresholds: z.array(thresholdRule).optional(),
});

export const dashboardSpecSchema = z.object({
  version: z.literal(1),
  title: z.string().optional(),
  layout: layoutNode,
  widgets: z.record(z.string(), widgetNode),
});

export type ManifestIssue = {
  /** Dotted path into the spec, e.g. `widgets.exposure.component`. */
  path: string;
  message: string;
};

export type ManifestValidation =
  | { ok: true; spec: DashboardSpec; issues: [] }
  | { ok: false; issues: ManifestIssue[] };

type RawLayoutNode = {
  type?: string;
  ref?: string;
  direction?: string;
  resizable?: boolean;
  height?: string;
  children?: RawLayoutNode[];
};

function walkLayout(
  node: RawLayoutNode,
  path: string,
  visit: (node: RawLayoutNode, path: string) => void,
): void {
  visit(node, path);
  node.children?.forEach((child, index) =>
    walkLayout(child, `${path}.children[${index}]`, visit),
  );
}

export type ValidateOptions = {
  /**
   * When supplied, every widget's `component` must be one of these keys.
   * Pass `Object.keys(registry)` to catch a typo'd or hallucinated component
   * name before it renders as an `UnknownWidget` placeholder.
   */
  knownComponents?: Iterable<string>;
};

/**
 * Validates a candidate manifest. Never throws — an agent-submitted patch is
 * untrusted input, and the caller needs the reasons, not a stack trace.
 */
export function validateDashboardSpec(
  candidate: unknown,
  { knownComponents }: ValidateOptions = {},
): ManifestValidation {
  const parsed = dashboardSpecSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.') || '(root)',
        message: issue.message,
      })),
    };
  }

  const spec = parsed.data as unknown as DashboardSpec;
  const issues: ManifestIssue[] = [];
  const known = knownComponents ? new Set(knownComponents) : null;

  // ── Referential pass ────────────────────────────────────────────────────
  const referenced = new Set<string>();
  walkLayout(spec.layout as RawLayoutNode, 'layout', (node, path) => {
    if (node.type === 'widget') {
      const ref = node.ref as string;
      referenced.add(ref);
      if (!(ref in spec.widgets)) {
        issues.push({
          path: `${path}.ref`,
          message: `layout references unknown widget "${ref}" — add it to \`widgets\` or fix the ref`,
        });
      }
      return;
    }
    if (node.resizable && node.direction === 'column' && !node.height) {
      issues.push({
        path: `${path}.height`,
        message:
          'a resizable `column` split needs an explicit `height` — a vertical splitter has no content-driven size to divide',
      });
    }
  });

  for (const [key, widget] of Object.entries(spec.widgets)) {
    if (widget.id !== key) {
      issues.push({
        path: `widgets.${key}.id`,
        message: `widget id "${widget.id}" does not match its registry key "${key}"`,
      });
    }
    if (!referenced.has(key)) {
      issues.push({
        path: `widgets.${key}`,
        message: `widget "${key}" is never placed by \`layout\` — it will not render`,
      });
    }
    if (known && !known.has(widget.component)) {
      issues.push({
        path: `widgets.${key}.component`,
        message: `unknown component "${widget.component}"`,
      });
    }
    // An agent-writable key that the widget cannot actually write is a policy
    // that silently does nothing — worth catching at the gate. `writes` is the
    // set of keys a widget produces; an `agentWritable` key must be one of them.
    const writes = widget.interaction?.writes ?? [];
    for (const exposed of widget.interaction?.agentWritable ?? []) {
      if (!writes.includes(exposed)) {
        issues.push({
          path: `widgets.${key}.interaction.agentWritable`,
          message: `"${exposed}" is marked agent-writable but is not in this widget's \`writes\``,
        });
      }
    }
  }

  return issues.length > 0
    ? { ok: false, issues }
    : { ok: true, spec, issues: [] };
}

/**
 * The set of interaction keys an agent is allowed to write, collected across
 * every widget in the manifest. Default-deny: an empty set means an agent may
 * read the dashboard but drive nothing.
 */
export function collectAgentWritableKeys(spec: DashboardSpec): Set<string> {
  const keys = new Set<string>();
  for (const widget of Object.values(spec.widgets)) {
    for (const key of widget.interaction?.agentWritable ?? []) keys.add(key);
  }
  return keys;
}
