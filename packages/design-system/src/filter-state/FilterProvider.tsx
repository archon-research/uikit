import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { RangePreset, TimeRange } from '../components/RangePicker.js';
import {
  EMPTY_FILTER_STATE,
  getFieldDateRange,
  getFieldRange,
  getFieldText,
  getFieldValues,
  type FilterFieldValue,
  type FilterState,
} from './types.js';

/**
 * The cross-component filter store.
 *
 * ## What this is
 * A small provider/hook pair (`FilterProvider` + `useFilterState`) holding one
 * shared, typed, serializable `FilterState` (see `types.ts`) that any number of
 * widgets — a filter bar's chips, a faceted multi-select, a range slider, a
 * `DataTable`, a summary chart — can read and write without prop-drilling.
 * `useFilterStore` is the uncontrolled default (internal `useState`, same
 * pattern as `useDataTable` in `data-table/hooks.ts`); `useUrlSyncedFilterStore`
 * (`urlSync.ts`) is the controlled, URL-backed alternative, mirroring
 * `useUrlSyncedTableStateAdapter`.
 *
 * ## Merge semantics
 * `'values'` fields append (multi-select ORs); `'range'`/`'dateRange'`/`'text'`
 * fields override outright. See `FILTER_FIELD_MERGE_MODE` in `types.ts`.
 *
 * ## Relationship to `DataTable`'s own column filters
 * `DataTable` separately exposes its own `columnFilters` (TanStack state)
 * with a `meta.filterVariant: 'select'` per-column facet UI
 * (`data-table/types.ts`/`hooks.ts`). That is a SEPARATE mechanism from this
 * store: it filters via TanStack's `getFilteredRowModel`/`getFacetedRowModel`
 * inside `useDataTable`, scoped to one table. This store instead filters by
 * slicing the row array *before* it reaches `useDataTable` (see the
 * filter-bar story's `matchesFilters`), so it can also drive a chart that has
 * no `DataTable` at all. The two don't talk to each other today — a
 * `DataTable` inside a `FilterProvider` still has its own, independent column
 * filter row. Wiring them (e.g. deriving `defaultColumnFilters`/
 * `onColumnFiltersChange` from the shared store's `'values'` fields) is a
 * natural follow-up, not done here.
 */

export interface FilterStateApi extends FilterState {
  /** Add/remove one value from a `'values'` field (append/OR semantics). */
  toggleValue: (field: string, value: string) => void;
  /** Replace a `'values'` field wholesale (still append-semantics vs. other fields). */
  setValues: (field: string, values: string[]) => void;
  /** Replace a `'range'` field, or clear it with `null`. */
  setRange: (field: string, range: { min: number; max: number } | null) => void;
  /** Replace a `'dateRange'` field, or clear it with `null`. */
  setDateRange: (
    field: string,
    preset: RangePreset,
    range: TimeRange | null,
  ) => void;
  /** Replace a `'text'` field, or clear it with `''`. */
  setText: (field: string, value: string) => void;
  /** Remove one field entirely, regardless of its kind. */
  clearField: (field: string) => void;
  /** Reset the whole store to empty. */
  clearAll: () => void;
}

function withField(
  state: FilterState,
  field: string,
  value: FilterFieldValue | null,
): FilterState {
  if (value === null) {
    if (!(field in state.fields)) return state;
    const nextFields = { ...state.fields };
    delete nextFields[field];
    return { fields: nextFields };
  }
  return { fields: { ...state.fields, [field]: value } };
}

export interface UseFilterStoreConfig {
  /** Uncontrolled seed state. Ignored once `state`/`onStateChange` are passed. */
  defaultState?: FilterState;
  /** Controlled state (e.g. from `useUrlSyncedFilterStore`). */
  state?: FilterState;
  onStateChange?: (next: FilterState) => void;
}

/**
 * Uncontrolled-by-default filter store hook. Pass `state`/`onStateChange`
 * (both required together) to run it controlled — `useUrlSyncedFilterStore`
 * does exactly this to back the store with a URL query param.
 */
export function useFilterStore(
  config: UseFilterStoreConfig = {},
): FilterStateApi {
  const [internalState, setInternalState] = useState<FilterState>(
    config.defaultState ?? EMPTY_FILTER_STATE,
  );
  const state = config.state ?? internalState;
  const emit = config.onStateChange ?? setInternalState;

  const setField = useCallback(
    (field: string, value: FilterFieldValue | null) => {
      emit(withField(state, field, value));
    },
    [emit, state],
  );

  const toggleValue = useCallback(
    (field: string, value: string) => {
      const current = getFieldValues(state, field);
      const next = current.includes(value)
        ? current.filter((existing) => existing !== value)
        : [...current, value];
      setField(
        field,
        next.length > 0 ? { kind: 'values', values: next } : null,
      );
    },
    [state, setField],
  );

  const setValues = useCallback(
    (field: string, values: string[]) => {
      setField(field, values.length > 0 ? { kind: 'values', values } : null);
    },
    [setField],
  );

  const setRange = useCallback(
    (field: string, range: { min: number; max: number } | null) => {
      setField(field, range ? { kind: 'range', ...range } : null);
    },
    [setField],
  );

  const setDateRange = useCallback(
    (field: string, preset: RangePreset, range: TimeRange | null) => {
      setField(field, range ? { kind: 'dateRange', preset, range } : null);
    },
    [setField],
  );

  const setText = useCallback(
    (field: string, value: string) => {
      setField(field, value ? { kind: 'text', value } : null);
    },
    [setField],
  );

  const clearField = useCallback(
    (field: string) => setField(field, null),
    [setField],
  );

  const clearAll = useCallback(() => emit(EMPTY_FILTER_STATE), [emit]);

  return useMemo(
    () => ({
      ...state,
      toggleValue,
      setValues,
      setRange,
      setDateRange,
      setText,
      clearField,
      clearAll,
    }),
    [
      state,
      toggleValue,
      setValues,
      setRange,
      setDateRange,
      setText,
      clearField,
      clearAll,
    ],
  );
}

const FilterStateContext = createContext<FilterStateApi | null>(null);

export interface FilterProviderProps {
  children: ReactNode;
  /**
   * Supply a store built elsewhere (e.g. `useUrlSyncedFilterStore`) so the
   * provider and its consumers share that exact instance. Omit to let the
   * provider own an uncontrolled store itself.
   */
  value?: FilterStateApi;
}

/**
 * Supplies one shared `FilterStateApi` to every descendant via
 * `useFilterState`. Wrap a filter bar + a `DataTable` + a chart in one
 * `FilterProvider` and all three read/write the same fields — no
 * master/detail wiring: any panel can read or write any selection.
 */
export function FilterProvider({ children, value }: FilterProviderProps) {
  const internal = useFilterStore();
  const api = value ?? internal;
  return (
    <FilterStateContext.Provider value={api}>
      {children}
    </FilterStateContext.Provider>
  );
}

/** Full read/write access to the shared filter store. */
export function useFilterState(): FilterStateApi {
  const context = useContext(FilterStateContext);
  if (!context) {
    throw new Error('useFilterState must be used within a FilterProvider.');
  }
  return context;
}

/** Narrow selector hook for one `'values'` (faceted multi-select / chips) field. */
export function useFilterValues(field: string) {
  const { fields, toggleValue, setValues, clearField } = useFilterState();
  const values = useMemo(
    () => getFieldValues({ fields }, field),
    [fields, field],
  );
  const handleToggle = useCallback(
    (value: string) => toggleValue(field, value),
    [toggleValue, field],
  );
  const handleSet = useCallback(
    (next: string[]) => setValues(field, next),
    [setValues, field],
  );
  const handleClear = useCallback(() => clearField(field), [clearField, field]);
  return {
    values,
    toggle: handleToggle,
    setValues: handleSet,
    clear: handleClear,
  } as const;
}

/** Narrow selector hook for one `'range'` (numeric range slider) field. */
export function useFilterRange(field: string) {
  const { fields, setRange, clearField } = useFilterState();
  const range = useMemo(
    () => getFieldRange({ fields }, field),
    [fields, field],
  );
  const handleSet = useCallback(
    (next: { min: number; max: number } | null) => setRange(field, next),
    [setRange, field],
  );
  const handleClear = useCallback(() => clearField(field), [clearField, field]);
  return { range, setRange: handleSet, clear: handleClear } as const;
}

/** Narrow selector hook for one `'dateRange'` field. */
export function useFilterDateRange(field: string) {
  const { fields, setDateRange, clearField } = useFilterState();
  const dateRange = useMemo(
    () => getFieldDateRange({ fields }, field),
    [fields, field],
  );
  const handleSet = useCallback(
    (preset: RangePreset, range: TimeRange | null) =>
      setDateRange(field, preset, range),
    [setDateRange, field],
  );
  const handleClear = useCallback(() => clearField(field), [clearField, field]);
  return { dateRange, setDateRange: handleSet, clear: handleClear } as const;
}

/** Narrow selector hook for one `'text'` field. */
export function useFilterText(field: string) {
  const { fields, setText, clearField } = useFilterState();
  const value = useMemo(() => getFieldText({ fields }, field), [fields, field]);
  const handleSet = useCallback(
    (next: string) => setText(field, next),
    [setText, field],
  );
  const handleClear = useCallback(() => clearField(field), [clearField, field]);
  return { value, setText: handleSet, clear: handleClear } as const;
}
