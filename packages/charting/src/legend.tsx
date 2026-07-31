import { chartTokens } from './theme.js';

export type ChartLegendItem = {
  label: string;
  /** Swatch color. Usually one of `seriesColor.*`. */
  color: string;
};

export type ChartLegendProps = {
  items: ChartLegendItem[];
  /** Swatch shape. Defaults to a filled square; `'line'` suits line/area series. */
  shape?: 'swatch' | 'line';
};

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
 */
export function ChartLegend({ items, shape = 'swatch' }: ChartLegendProps) {
  if (items.length === 0) return null;

  return (
    <div
      role="list"
      aria-label="Chart legend"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center',
        fontSize: 13,
        color: chartTokens.label,
      }}
    >
      {items.map((item) => (
        <span
          key={item.label}
          role="listitem"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <svg width={14} height={14} aria-hidden="true">
            {shape === 'line' ? (
              <line
                x1={0}
                y1={7}
                x2={14}
                y2={7}
                stroke={item.color}
                strokeWidth={2}
              />
            ) : (
              <rect
                x={1}
                y={1}
                width={12}
                height={12}
                rx={2}
                fill={item.color}
              />
            )}
          </svg>
          {item.label}
        </span>
      ))}
    </div>
  );
}
