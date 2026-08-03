import { Panel, SplitLayout } from '@archon-research/design-system';
import { type CSSProperties, type JSX } from 'react';

import {
  useLocalInteraction,
  type InteractionContextValue,
} from './interaction.js';
import {
  DEFAULT_REGISTRY,
  UnknownWidget,
  type ComponentRegistry,
} from './registry.js';
import type {
  DashboardSpec,
  DashboardDataSources,
  LayoutNode,
  SplitLayoutNode,
} from './schema.js';
import { validateDashboardSpec, type ManifestIssue } from './validate.js';

/**
 * The recursive `DashboardSpec` -> JSX renderer. Walks `spec.layout`
 * (positions/nesting only — see schema.ts for why layout stays separate from
 * widget config and data binding), resolving each `widget` leaf through
 * `spec.widgets` and then through the string -> component `registry`. An
 * unresolved widget ref or component key renders an inline `UnknownWidget`
 * marker instead of throwing, so one bad manifest entry doesn't blank the
 * whole dashboard.
 *
 * A `split` node with `resizable: true` becomes a design-system `SplitLayout`
 * (an Ark `Splitter`), one drag-resizable panel per child; otherwise it's a
 * plain flex box that wraps at narrow widths. Nesting works either way — each
 * panel's content is just another recursive render.
 */

/** Default height for a resizable split that declares none (a `column` split must; validation enforces it). */
const DEFAULT_RESIZABLE_HEIGHT = '420px';

const rootStyle: CSSProperties = {
  width: '100%',
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};

const titleStyle: CSSProperties = {
  fontSize: '1.125rem',
  fontWeight: 600,
  color: 'var(--colors-text-default, currentColor)',
  margin: 0,
};

const invalidStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  padding: '1rem',
  borderRadius: '0.5rem',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'var(--colors-border-critical, currentColor)',
  background: 'var(--colors-bg-critical, transparent)',
  color: 'var(--colors-text-critical, currentColor)',
  fontSize: '0.875rem',
};

const issueListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  fontFamily: 'var(--fonts-mono, monospace)',
  fontSize: '0.75rem',
  listStyle: 'none',
  padding: 0,
  margin: 0,
};

/**
 * What an invalid manifest renders instead of a dashboard: an annotated list,
 * not a thrown error — the whole point of the gate is that an agent-submitted
 * patch produces a readable rejection a human (or the agent) can act on.
 */
function InvalidSpec({ issues }: { issues: ManifestIssue[] }): JSX.Element {
  return (
    <div style={invalidStyle} role="alert">
      <strong>
        This dashboard manifest is invalid ({issues.length} issue
        {issues.length === 1 ? '' : 's'}) and was not rendered.
      </strong>
      <ul style={issueListStyle}>
        {issues.map((issue) => (
          <li key={`${issue.path}:${issue.message}`}>
            <code>{issue.path}</code> — {issue.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

type RenderContext = {
  widgets: DashboardSpec['widgets'];
  dataSources: DashboardDataSources;
  registry: ComponentRegistry;
  interaction: InteractionContextValue;
};

function renderWidget(ref: string, ctx: RenderContext): JSX.Element {
  const widget = ctx.widgets[ref];
  if (!widget) {
    return (
      <UnknownWidget label={`layout references unknown widget "${ref}"`} />
    );
  }
  const Adapter = ctx.registry[widget.component];
  if (!Adapter) {
    return <UnknownWidget label={widget.component} />;
  }
  const data = widget.dataBinding
    ? (ctx.dataSources[widget.dataBinding.source] ?? [])
    : [];
  return (
    <Panel
      title={widget.title}
      style={{ width: '100%', minWidth: 0 }}
      data-widget-id={widget.id}
      data-widget-component={widget.component}
    >
      <Adapter widget={widget} data={data} interaction={ctx.interaction} />
    </Panel>
  );
}

function splitContainerStyle(direction: 'row' | 'column'): CSSProperties {
  return {
    display: 'flex',
    flexDirection: direction,
    flexWrap: direction === 'row' ? 'wrap' : 'nowrap',
    gap: '1rem',
    width: '100%',
    minWidth: 0,
  };
}

function ResizableSplit({
  node,
  ctx,
  nodeKey,
}: {
  node: SplitLayoutNode;
  ctx: RenderContext;
  nodeKey: string;
}): JSX.Element {
  const panels = node.children.map((child, index) => ({
    id: `${nodeKey}.${index}`,
    size: child.size ?? 1,
    content: renderLayoutNode(child, ctx, `${nodeKey}.${index}`),
  }));
  const height = node.height ?? DEFAULT_RESIZABLE_HEIGHT;
  return (
    <div style={{ width: '100%', minWidth: 0, height }}>
      <SplitLayout
        orientation={node.direction === 'row' ? 'horizontal' : 'vertical'}
        panels={panels}
      />
    </div>
  );
}

export function renderLayoutNode(
  node: LayoutNode,
  ctx: RenderContext,
  key: string,
): JSX.Element {
  if (node.type === 'widget') {
    return (
      <div
        key={key}
        style={{
          display: 'flex',
          flexDirection: 'column',
          minWidth: '280px',
          flexGrow: node.size ?? 1,
          flexBasis: 0,
        }}
      >
        {renderWidget(node.ref, ctx)}
      </div>
    );
  }

  const inner = node.resizable ? (
    <ResizableSplit node={node} ctx={ctx} nodeKey={key} />
  ) : (
    <div style={splitContainerStyle(node.direction)}>
      {node.children.map((child, index) =>
        renderLayoutNode(child, ctx, `${key}.${index}`),
      )}
    </div>
  );

  return (
    <div
      key={key}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        flexGrow: node.size ?? 1,
        flexBasis: 0,
      }}
    >
      {inner}
    </div>
  );
}

export type DashboardRendererProps = {
  spec: DashboardSpec;
  dataSources: DashboardDataSources;
  /**
   * The string -> component registry. Defaults to {@link DEFAULT_REGISTRY};
   * pass a merged registry (see `mergeRegistries`) to add domain adapters.
   */
  registry?: ComponentRegistry;
  /**
   * A real interaction store (e.g. charting-backed via
   * `useChartingInteraction`). Omit to use a self-contained local store, which
   * every standalone manifest (a story, a preview) can rely on unchanged.
   */
  interaction?: InteractionContextValue;
  /**
   * Skip the zod gate. Only for a spec the caller authored and trusts (where
   * validation is a dev-time assertion, not a trust boundary); leave it on for
   * any spec an agent or a command bar produced.
   */
  skipValidation?: boolean;
};

/**
 * Renders a `DashboardSpec`. Validates first (unless `skipValidation`), showing
 * an annotated rejection for an invalid manifest rather than throwing.
 */
export function DashboardRenderer({
  spec,
  dataSources,
  registry = DEFAULT_REGISTRY,
  interaction,
  skipValidation = false,
}: DashboardRendererProps): JSX.Element {
  const localInteraction = useLocalInteraction();
  const resolvedInteraction = interaction ?? localInteraction;

  if (!skipValidation) {
    const result = validateDashboardSpec(spec, {
      knownComponents: Object.keys(registry),
    });
    if (!result.ok) return <InvalidSpec issues={result.issues} />;
  }

  const ctx: RenderContext = {
    widgets: spec.widgets,
    dataSources,
    registry,
    interaction: resolvedInteraction,
  };

  return (
    <div style={rootStyle}>
      {spec.title ? <h2 style={titleStyle}>{spec.title}</h2> : null}
      {renderLayoutNode(spec.layout, ctx, 'root')}
    </div>
  );
}
