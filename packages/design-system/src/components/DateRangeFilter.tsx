import type { CSSProperties } from 'react';

import {
  RangePicker,
  type RangePreset,
  type TimeRange,
} from './RangePicker.js';

export interface DateRangeFilterProps {
  /** Field label rendered above the picker (e.g. "Activity window"). */
  label: string;
  preset: RangePreset;
  range: TimeRange;
  /** Bind directly to `useFilterDateRange(field).setDateRange`. */
  onChange: (preset: RangePreset, range: TimeRange) => void;
  className?: string;
  style?: CSSProperties;
}

const labelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: '0.02em',
  color: 'var(--colors-text-muted, #667085)',
};

const rootStyle: CSSProperties = {
  display: 'grid',
  gap: 6,
};

/**
 * The date-range filter affordance. A thin label + layout
 * wrapper over `RangePicker` — `RangePicker` already owns the full picker UI
 * (presets + custom modal) and its `TimeRange` shape
 * (`{from_timestamp, to_timestamp}` ISO strings) IS this filter store's
 * `'dateRange'` field shape (`filter-state/types.ts`), so this wrapper adds
 * no conversion, just a named, filter-bar-shaped label. Bind straight to
 * `useFilterDateRange(field)`.
 */
export function DateRangeFilter({
  label,
  preset,
  range,
  onChange,
  className,
  style,
}: DateRangeFilterProps) {
  return (
    <div className={className} style={{ ...rootStyle, ...style }}>
      <span style={labelStyle}>{label}</span>
      <RangePicker preset={preset} range={range} onChange={onChange} />
    </div>
  );
}
