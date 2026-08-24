import {
  Axis,
  AreaSeries,
  Grid,
  LineSeries,
  Tooltip,
  XYChart,
  chartTheme,
} from '@archon-research/charting';
import {
  Badge,
  DataTable,
  Sparkline,
  StatRow,
  StatTile,
  useDataTable,
  type ColumnDef,
  type StatTileTone,
} from '@archon-research/design-system';
import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
} from 'react';

import {
  useInteractionField,
  type InteractionContextValue,
} from './interaction.js';
import type { ThresholdRule, WidgetNode, WidgetTableColumn } from './schema.js';

/**
 * The string -> component registry. A manifest's `WidgetNode.component` names a
 * key here; the resolved adapter owns translating that widget's
 * `dataBinding.fields` mapping + `props` into a real component's prop shape, so
 * the manifest stays declarative (field names, not JSX).
 *
 * The registry is an EXTENSIBLE MECHANISM: {@link DEFAULT_REGISTRY} ships a
 * small set of generic adapters over public design-system + charting
 * components, and a consumer merges in their own domain adapters with
 * {@link mergeRegistries} (or replaces it wholesale). The engine itself knows
 * nothing about any specific widget.
 */
export type RegistryComponentProps = {
  widget: WidgetNode;
  data: Record<string, unknown>[];
  interaction: InteractionContextValue;
};

export type RegistryComponent = (props: RegistryComponentProps) => JSX.Element;

export type ComponentRegistry = Record<string, RegistryComponent>;

const lastRecord = (
  data: Record<string, unknown>[],
): Record<string, unknown> => (data.length > 0 ? data[data.length - 1]! : {});

const toNumber = (value: unknown): number =>
  typeof value === 'number' ? value : Number(value ?? Number.NaN);

function resolveThresholdTone(
  value: number | undefined,
  thresholds: ThresholdRule[] | undefined,
): StatTileTone {
  if (value === undefined || !thresholds) return 'default';
  for (const rule of thresholds) {
    const hit =
      (rule.op === 'gte' && value >= rule.value) ||
      (rule.op === 'lte' && value <= rule.value) ||
      (rule.op === 'gt' && value > rule.value) ||
      (rule.op === 'lt' && value < rule.value) ||
      (rule.op === 'eq' && value === rule.value);
    if (hit) return rule.severity === 'success' ? 'success' : 'critical';
  }
  return 'default';
}

/** Fallback width used only before the first ResizeObserver measurement. */
const FALLBACK_CHART_WIDTH = 560;

/**
 * Sizes a chart's SVG `width` (a hard pixel dimension, not CSS) to whatever
 * width its container is granted, via a `ResizeObserver` on a callback ref. An
 * explicit `widget.props.width` still wins.
 */
function useChartWidth(explicitWidth: number | undefined) {
  const [measured, setMeasured] = useState(FALLBACK_CHART_WIDTH);
  const observerRef = useRef<ResizeObserver | null>(null);
  const ref = useCallback(
    (el: HTMLDivElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (explicitWidth != null || !el) return;
      const observer = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width;
        if (width && width > 0) setMeasured(Math.floor(width));
      });
      observer.observe(el);
      observerRef.current = observer;
    },
    [explicitWidth],
  );
  return { ref, width: explicitWidth ?? measured };
}

const CHART_MARGIN = { top: 16, right: 24, bottom: 32, left: 48 };

const noteStyle: CSSProperties = {
  color: 'var(--colors-text-muted)',
  fontSize: '0.875rem',
  lineHeight: 1.6,
  margin: 0,
};

/** A free-form note paragraph, text supplied via `props.text`. */
const NoteWidget: RegistryComponent = ({ widget }) => (
  <p style={noteStyle}>{String(widget.props?.text ?? '')}</p>
);

/**
 * Formats a numeric value per `props.format`. Non-numeric input falls through
 * to its string form (or an em dash).
 */
function formatStatValue(value: unknown, format: string | undefined): string {
  const numeric = toNumber(value);
  if (!Number.isFinite(numeric)) return String(value ?? '—');
  switch (format) {
    case 'percent':
      return `${(numeric * 100).toFixed(1)}%`;
    case 'ratio':
      return numeric.toFixed(2);
    case 'currency':
      return `$${numeric.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    default:
      return String(numeric);
  }
}

/** A single stat tile; value/tone resolved from the bound source + thresholds. */
const StatWidget: RegistryComponent = ({ widget, data }) => {
  const fields = widget.dataBinding?.fields ?? {};
  const record = lastRecord(data);
  const rawValue = fields.value ? record[fields.value] : undefined;
  const numeric = toNumber(rawValue);
  const tone = resolveThresholdTone(
    Number.isFinite(numeric) ? numeric : undefined,
    widget.thresholds,
  );
  return (
    <StatTile
      label={(widget.props?.label as string) ?? widget.title ?? widget.id}
      value={formatStatValue(
        rawValue,
        widget.props?.format as string | undefined,
      )}
      sub={widget.props?.sub as string | undefined}
      tone={tone}
    />
  );
};

/**
 * A row of stat tiles, one per bound record. Reads its first declared
 * interaction key (`interaction.reads[0]`) as a highlighted-row key: the tile
 * whose label field matches gets a `success` tone, proving `reads` is wired.
 */
const StatRowWidget: RegistryComponent = ({ widget, data, interaction }) => {
  const fields = widget.dataBinding?.fields ?? {};
  const highlightKey = widget.interaction?.reads?.[0];
  const highlighted = useInteractionField(interaction, highlightKey);
  return (
    <StatRow>
      {data.map((record, index) => {
        const label = fields.label ? String(record[fields.label]) : `#${index}`;
        const value = fields.value ? record[fields.value] : undefined;
        const isHighlighted =
          highlighted != null && String(highlighted) === label;
        return (
          <StatTile
            key={label}
            label={label}
            value={formatStatValue(
              value,
              widget.props?.format as string | undefined,
            )}
            sub={fields.sub ? String(record[fields.sub] ?? '') : undefined}
            tone={isHighlighted ? 'success' : 'default'}
          />
        );
      })}
    </StatRow>
  );
};

function renderCell(
  column: WidgetTableColumn,
  value: unknown,
): JSX.Element | string {
  switch (column.render) {
    case 'number':
      return typeof value === 'number'
        ? value.toLocaleString('en-US', { maximumFractionDigits: 2 })
        : String(value ?? '—');
    case 'currency':
      return typeof value === 'number'
        ? `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
        : String(value ?? '—');
    case 'percent':
      return typeof value === 'number'
        ? `${value.toFixed(1)}%`
        : String(value ?? '—');
    case 'badge': {
      const palette =
        value === 'low' || value === 'success'
          ? 'green'
          : value === 'high' || value === 'critical'
            ? 'red'
            : 'amber';
      return (
        <Badge colorPalette={palette} variant="subtle">
          {String(value ?? '—')}
        </Badge>
      );
    }
    case 'sparkline':
      return Array.isArray(value) ? (
        <Sparkline data={value as number[]} width={96} height={28} area />
      ) : (
        '—'
      );
    default:
      return String(value ?? '—');
  }
}

/**
 * A data table with declarative columns (`props.columns`). Writes its first
 * declared interaction key (`interaction.writes[0]`) on row click — the
 * clicked row's key value — proving `writes` is wired; the same key read by a
 * sibling widget drives cross-highlighting.
 */
const TableWidget: RegistryComponent = ({ widget, data, interaction }) => {
  const specColumns = widget.props?.columns ?? [];
  const rowKeyField =
    widget.dataBinding?.fields?.rowKey ?? specColumns[0]?.accessorKey;
  const writeKey = widget.interaction?.writes?.[0];
  const highlightKey = widget.interaction?.reads?.[0] ?? writeKey;
  const selected = useInteractionField(interaction, highlightKey);

  const columns: ColumnDef<Record<string, unknown>>[] = specColumns.map(
    (column) => ({
      accessorKey: column.accessorKey,
      header: column.header,
      cell: (info) => renderCell(column, info.getValue()),
    }),
  );

  const table = useDataTable(data, columns);
  const getRowKey = useCallback(
    (row: Record<string, unknown>) =>
      rowKeyField ? String(row[rowKeyField]) : '',
    [rowKeyField],
  );

  return (
    <DataTable
      table={table}
      isLoading={false}
      getRowKey={getRowKey}
      selectedRowKey={selected != null ? String(selected) : undefined}
      onRowClick={
        writeKey && rowKeyField
          ? (row) => interaction.write(writeKey, row[rowKeyField])
          : undefined
      }
    />
  );
};

const chartWrapStyle: CSSProperties = {
  width: '100%',
  minWidth: 0,
  overflowX: 'auto',
};

type SeriesConfig = { key: string; field: string };

function readSeries(widget: WidgetNode): SeriesConfig[] {
  const raw = widget.props?.series;
  if (Array.isArray(raw)) return raw as SeriesConfig[];
  // Fall back to a single series bound through `dataBinding.fields.value`.
  const field = widget.dataBinding?.fields?.value;
  return field ? [{ key: widget.title ?? widget.id, field }] : [];
}

function makeChartWidget(kind: 'line' | 'area'): RegistryComponent {
  return function ChartWidget({ widget, data }) {
    const explicitWidth = widget.props?.width as number | undefined;
    const height = (widget.props?.height as number | undefined) ?? 260;
    const { ref, width } = useChartWidth(explicitWidth);
    const xField = (widget.props?.xField as string | undefined) ?? 'x';
    const series = readSeries(widget);
    const label =
      (widget.props?.ariaLabel as string | undefined) ??
      widget.title ??
      `${kind} chart`;

    if (data.length === 0 || series.length === 0) {
      return <div ref={ref} style={chartWrapStyle} />;
    }

    const xAccessor = (d: Record<string, unknown>) => d[xField];
    return (
      <div ref={ref} style={chartWrapStyle} role="img" aria-label={label}>
        <XYChart
          theme={chartTheme}
          width={width}
          height={height}
          margin={CHART_MARGIN}
          xScale={{ type: 'band', paddingInner: 0.3 }}
          yScale={{ type: 'linear', nice: true }}
        >
          <Grid columns={false} numTicks={4} />
          <Axis orientation="bottom" numTicks={4} />
          <Axis orientation="left" numTicks={4} />
          {series.map((s) =>
            kind === 'line' ? (
              <LineSeries
                key={s.key}
                dataKey={s.key}
                data={data}
                xAccessor={xAccessor}
                yAccessor={(d) => toNumber(d[s.field])}
              />
            ) : (
              <AreaSeries
                key={s.key}
                dataKey={s.key}
                data={data}
                xAccessor={xAccessor}
                yAccessor={(d) => toNumber(d[s.field])}
                fillOpacity={0.3}
              />
            ),
          )}
          <Tooltip
            snapTooltipToDatumX
            snapTooltipToDatumY
            showSeriesGlyphs
            renderTooltip={({ tooltipData }) => {
              const datum = tooltipData?.nearestDatum?.datum as
                | Record<string, unknown>
                | undefined;
              return datum ? String(datum[xField]) : null;
            }}
          />
        </XYChart>
      </div>
    );
  };
}

/**
 * The default registry: a small set of GENERIC adapters over public
 * design-system + charting components. Nothing domain-specific — a consumer
 * merges in their own component keys with {@link mergeRegistries}.
 */
export const DEFAULT_REGISTRY: ComponentRegistry = {
  note: NoteWidget,
  stat: StatWidget,
  statRow: StatRowWidget,
  table: TableWidget,
  lineChart: makeChartWidget('line'),
  areaChart: makeChartWidget('area'),
};

/** Merges consumer adapters over the defaults (consumer keys win on collision). */
export function mergeRegistries(
  ...registries: ComponentRegistry[]
): ComponentRegistry {
  return Object.assign({}, DEFAULT_REGISTRY, ...registries);
}

const unknownStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.375rem',
  padding: '0.25rem 0.5rem',
  borderRadius: '0.375rem',
  borderWidth: '1px',
  borderStyle: 'dashed',
  borderColor: 'var(--colors-border-critical, currentColor)',
  color: 'var(--colors-text-critical, currentColor)',
  fontFamily: 'var(--fonts-mono, monospace)',
  fontSize: '0.75rem',
};

/**
 * Inline marker rendered in place of a widget whose ref or component key does
 * not resolve — one bad manifest entry never blanks the whole dashboard.
 */
export function UnknownWidget({ label }: { label: string }): JSX.Element {
  return (
    <span style={unknownStyle} role="status">
      unknown widget: {label}
    </span>
  );
}
