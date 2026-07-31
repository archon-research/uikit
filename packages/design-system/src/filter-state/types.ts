import type { RangePreset, TimeRange } from '../components/RangePicker.js';

// Shared, serializable filter state read/written by any component (chips,
// faceted multi-select, range slider, date-range, DataTable, charts). See
// `FilterProvider.tsx` for the full contract note.

/**
 * Per-field merge policy:
 * - `'values'` fields (facet multi-select, chips) are additive — selecting a
 *   second value ORs it in rather than replacing the first.
 * - `'range'` / `'dateRange'` / `'text'` fields are single-valued and always
 *   replace outright.
 */
export type FilterMergeMode = 'append' | 'override';

export interface FilterValuesField {
  kind: 'values';
  /** OR'd together — a row matches if its field value is any of these. */
  values: string[];
}

export interface FilterRangeField {
  kind: 'range';
  min: number;
  max: number;
}

export interface FilterDateRangeField {
  kind: 'dateRange';
  preset: RangePreset;
  /** Same shape `RangePicker` already uses, so this field binds directly. */
  range: TimeRange;
}

export interface FilterTextField {
  kind: 'text';
  value: string;
}

export type FilterFieldValue =
  | FilterValuesField
  | FilterRangeField
  | FilterDateRangeField
  | FilterTextField;

export const FILTER_FIELD_MERGE_MODE: Record<
  FilterFieldValue['kind'],
  FilterMergeMode
> = {
  values: 'append',
  range: 'override',
  dateRange: 'override',
  text: 'override',
};

/**
 * The whole shared filter bag. A flat `Record<field, FilterFieldValue>` rather
 * than fixed named slots — the filter bar is open-ended (any number of
 * facets/ranges a consumer wires up), so field identity is a string key the
 * widget itself owns (e.g. `'category'`, `'region'`, `'amount'`).
 */
export interface FilterState {
  fields: Record<string, FilterFieldValue>;
}

export const EMPTY_FILTER_STATE: FilterState = { fields: {} };

export function getFieldValues(state: FilterState, field: string): string[] {
  const entry = state.fields[field];
  return entry?.kind === 'values' ? entry.values : [];
}

export function getFieldRange(
  state: FilterState,
  field: string,
): { min: number; max: number } | null {
  const entry = state.fields[field];
  return entry?.kind === 'range' ? { min: entry.min, max: entry.max } : null;
}

export function getFieldDateRange(
  state: FilterState,
  field: string,
): { preset: RangePreset; range: TimeRange } | null {
  const entry = state.fields[field];
  return entry?.kind === 'dateRange'
    ? { preset: entry.preset, range: entry.range }
    : null;
}

export function getFieldText(state: FilterState, field: string): string {
  const entry = state.fields[field];
  return entry?.kind === 'text' ? entry.value : '';
}

/** True when no field carries an active filter — "show everything". */
export function isFilterStateEmpty(state: FilterState): boolean {
  return Object.keys(state.fields).length === 0;
}
