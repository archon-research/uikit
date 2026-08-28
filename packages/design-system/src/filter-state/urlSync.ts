import { useCallback, useMemo } from 'react';

import { useFilterStore, type FilterStateApi } from './FilterProvider.js';
import { EMPTY_FILTER_STATE, type FilterState } from './types.js';

/**
 * URL-sync adapter for the shared filter store, mirroring
 * `UrlSyncedTableStateAdapter` (`data-table/types.ts`) and
 * `useUrlSyncedTableStateAdapter` (`data-table/hooks.ts`): the consumer owns
 * the actual URL (`useSearchParams`, a router, whatever), this hook only
 * knows how to read/write one query param.
 *
 * Unlike the table adapter's fixed `sortParam`/`searchParam` pair, the filter
 * bag's field set is open-ended, so the whole bag round-trips through a
 * single param as compact JSON (stable key order) rather than one param per
 * field. A consumer that wants readable URLs can trade this for per-field
 * params instead.
 */
export interface UrlSyncedFilterAdapter {
  filtersParam: string | null;
  setFiltersParam: (value: string | null) => void;
}

export function serializeFilterState(state: FilterState): string | null {
  const keys = Object.keys(state.fields).sort();
  if (keys.length === 0) return null;
  const ordered: FilterState['fields'] = {};
  for (const key of keys) {
    // `keys` comes from `state.fields`, so the lookup always hits; skipping a
    // miss keeps the key out of the serialized form rather than writing
    // `undefined` into it.
    const value = state.fields[key];
    if (value !== undefined) ordered[key] = value;
  }
  return JSON.stringify(ordered);
}

export function deserializeFilterState(
  serialized: string | null | undefined,
): FilterState {
  if (!serialized) return EMPTY_FILTER_STATE;
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { fields: parsed as FilterState['fields'] };
    }
  } catch {
    // Malformed/tampered URL state degrades to "no filters" rather than throwing.
  }
  return EMPTY_FILTER_STATE;
}

/**
 * Runs the filter store controlled by a URL query param via `adapter`. Wire
 * the returned `FilterStateApi` straight into `FilterProvider`'s `value` prop
 * so every consumer reads/writes through the URL.
 */
export function useUrlSyncedFilterStore(
  adapter: UrlSyncedFilterAdapter,
): FilterStateApi {
  const state = useMemo(
    () => deserializeFilterState(adapter.filtersParam),
    [adapter.filtersParam],
  );

  const onStateChange = useCallback(
    (next: FilterState) => {
      adapter.setFiltersParam(serializeFilterState(next));
    },
    [adapter],
  );

  return useFilterStore({ state, onStateChange });
}
