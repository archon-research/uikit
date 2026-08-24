import { resolveChartColor, type ChartColor } from './chart-color.js';
import { chartTokens } from './theme.js';

export type ChartLegendItem = {
  label: string;
  /**
   * Swatch color. Prefer a token name (`'chart.series.primary'`); a raw CSS
   * color string also works, which is what `useIdentityPalette` returns.
   */
  color: ChartColor;
  /**
   * Stable identity for interaction callbacks. Defaults to `label` when
   * omitted, so a legend built from unique labels needs no explicit id.
   */
  id?: string;
  /** When true, renders dimmed with a struck-through label (a toggled-off series). */
  hidden?: boolean;
  /** When true, renders the label bolder to emphasize this series. */
  emphasis?: boolean;
  /** When true and `shape="line"`, renders the line swatch dashed. */
  dash?: boolean;
  /** Small trailing note, e.g. a unit or a last value. */
  note?: string;
  /** Small trailing badge, e.g. a count or a status tag. */
  badge?: string;
};

export type ChartLegendProps = {
  items: ChartLegendItem[];
  /** Swatch shape. Defaults to a filled square; `'line'` suits line/area series. */
  shape?: 'swatch' | 'line';
  /**
   * When true, each item becomes a focusable `<button>` (a toggle), enabling
   * `onToggle`/`onHover`. When false (the default), the legend is a static
   * `role="list"` with identical markup to before this option existed —
   * fully backward compatible.
   */
  interactive?: boolean;
  /** Fires with an item's id when it is clicked (interactive only). */
  onToggle?: (id: string) => void;
  /**
   * Fires with an item's id on pointer/focus enter, and `null` on leave/blur
   * (interactive only). Pair with `useHighlightedKey` to emphasize a series
   * across a synced chart group.
   */
  onHover?: (id: string | null) => void;
  /**
   * Render each item's label in its swatch color (a colored-label legend)
   * instead of the default muted label color. Off by default. Works in both the
   * static and interactive forms.
   */
  colorLabel?: boolean;
};

/** Resolves an item's interaction identity, falling back to its label. */
function itemId(item: ChartLegendItem): string {
  return item.id ?? item.label;
}

/** The swatch SVG shared by the static and interactive item renderers. */
function Swatch({
  shape,
  color,
  dash,
}: {
  shape: 'swatch' | 'line';
  color: ChartColor;
  dash?: boolean;
}) {
  const resolved = resolveChartColor(color);
  return (
    <svg width={14} height={14} aria-hidden="true">
      {shape === 'line' ? (
        <line
          x1={0}
          y1={7}
          x2={14}
          y2={7}
          stroke={resolved}
          strokeWidth={2}
          strokeDasharray={dash ? '3 2' : undefined}
        />
      ) : (
        <rect x={1} y={1} width={12} height={12} rx={2} fill={resolved} />
      )}
    </svg>
  );
}

/** Trailing `note`/`badge` text shared by both renderers. */
function Trailing({ note, badge }: { note?: string; badge?: string }) {
  return (
    <>
      {note ? <span style={{ fontSize: 11, opacity: 0.7 }}>{note}</span> : null}
      {badge ? (
        <span
          style={{
            fontSize: 11,
            padding: '0 4px',
            borderRadius: 4,
            background: 'currentColor',
            color: chartTokens.surface,
          }}
        >
          {badge}
        </span>
      ) : null}
    </>
  );
}

/**
 * A provided, token-themed legend for `XYChart` series. Previously this
 * pattern was hand-rolled per-story (see the charting audit); it now lives in
 * the package so consumers get one consistent legend instead of re-deriving
 * swatch markup each time.
 *
 * This component renders plain inline SVG/HTML (no Panda dependency — the
 * charting package does not depend on the design system for styling); wrap it
 * in design-system typography classes from the consuming app if you need to
 * match surrounding text styles exactly.
 *
 * By default the legend is a static `role="list"`. Pass `interactive` to make
 * each item a focusable toggle button (with `onToggle`/`onHover`), for
 * show/hide and cross-highlight behavior.
 */
export function ChartLegend({
  items,
  shape = 'swatch',
  interactive = false,
  onToggle,
  onHover,
  colorLabel = false,
}: ChartLegendProps) {
  if (items.length === 0) return null;

  const containerStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'center',
    fontSize: 13,
    color: chartTokens.label,
  } as const;

  if (interactive) {
    return (
      <div style={containerStyle}>
        {items.map((item) => {
          const id = itemId(item);
          return (
            <button
              key={id}
              type="button"
              aria-pressed={!item.hidden}
              onClick={() => onToggle?.(id)}
              onMouseEnter={() => onHover?.(id)}
              onMouseLeave={() => onHover?.(null)}
              onFocus={() => onHover?.(id)}
              onBlur={() => onHover?.(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                margin: 0,
                padding: 0,
                border: 'none',
                background: 'none',
                font: 'inherit',
                color: 'inherit',
                cursor: 'pointer',
                opacity: item.hidden ? 0.45 : 1,
              }}
            >
              <Swatch shape={shape} color={item.color} dash={item.dash} />
              <span
                style={{
                  textDecoration: item.hidden ? 'line-through' : undefined,
                  fontWeight: item.emphasis ? 700 : undefined,
                  color: colorLabel ? resolveChartColor(item.color) : undefined,
                }}
              >
                {item.label}
              </span>
              <Trailing note={item.note} badge={item.badge} />
            </button>
          );
        })}
      </div>
    );
  }

  // Static legend: markup is intentionally identical to the pre-interactive
  // version (a `role="list"` of plain spans), so existing consumers are
  // unaffected. The `hidden`/`emphasis`/`note`/`badge` affordances apply only
  // to the interactive branch above.
  return (
    <div role="list" aria-label="Chart legend" style={containerStyle}>
      {items.map((item) => (
        <span
          key={itemId(item)}
          role="listitem"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <Swatch shape={shape} color={item.color} dash={item.dash} />
          {colorLabel ? (
            <span style={{ color: resolveChartColor(item.color) }}>
              {item.label}
            </span>
          ) : (
            item.label
          )}
        </span>
      ))}
    </div>
  );
}
