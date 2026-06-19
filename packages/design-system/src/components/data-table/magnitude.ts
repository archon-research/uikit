import type { Cell, Row, Table } from '@tanstack/react-table';

import type {
  DataTableMagnitudeConfig,
  DataTableMagnitudeScale,
} from './types';

type ColumnDomain = {
  min: number;
  max: number;
};

export type ColumnMagnitudeState = {
  domain: ColumnDomain;
  scale: DataTableMagnitudeScale;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function getRowScope<TData>(
  table: Table<TData>,
  scope: DataTableMagnitudeConfig<TData>['scope'],
): Row<TData>[] {
  return scope === 'all'
    ? table.getCoreRowModel().rows
    : table.getFilteredRowModel().rows;
}

function resolveMagnitudeValue<TData>(
  row: Row<TData>,
  cell: Cell<TData, unknown>,
  config: DataTableMagnitudeConfig<TData>,
): number | null {
  const customValue = config.getValue?.(row.original);

  if (customValue !== undefined && customValue !== null) {
    return isFiniteNumber(customValue) ? customValue : null;
  }

  const raw = cell.getValue();
  return isFiniteNumber(raw) ? raw : null;
}

function sanitizeDomain(domain: ColumnDomain | null): ColumnDomain | null {
  if (!domain) {
    return null;
  }

  if (!isFiniteNumber(domain.min) || !isFiniteNumber(domain.max)) {
    return null;
  }

  if (domain.max < domain.min) {
    return { min: domain.max, max: domain.min };
  }

  return domain;
}

function resolveDomainFromValues<TData>(
  values: number[],
  rows: Row<TData>[],
  config: DataTableMagnitudeConfig<TData>,
): ColumnDomain | null {
  if (values.length === 0) {
    return null;
  }

  const domain = config.domain;

  if (!domain || domain === 'column') {
    return { min: Math.min(...values), max: Math.max(...values) };
  }

  if (typeof domain === 'function') {
    return sanitizeDomain(
      domain(
        values,
        rows.map((row) => row.original),
      ),
    );
  }

  return sanitizeDomain(domain);
}

export function createMagnitudeStateMap<TData>(
  table: Table<TData>,
): Map<string, ColumnMagnitudeState> {
  const stateMap = new Map<string, ColumnMagnitudeState>();

  for (const column of table.getAllColumns()) {
    const magnitude = column.columnDef.meta?.magnitude;

    if (!magnitude) {
      continue;
    }

    if (magnitude.enabled === false) {
      continue;
    }

    const rows = getRowScope(table, magnitude.scope);
    const values: number[] = [];

    for (const row of rows) {
      const cell = row
        .getAllCells()
        .find((candidate) => candidate.column.id === column.id);

      if (!cell) {
        continue;
      }

      const resolvedValue = resolveMagnitudeValue(row, cell, magnitude);

      if (resolvedValue !== null) {
        values.push(resolvedValue);
      }
    }

    const domain = resolveDomainFromValues(values, rows, magnitude);

    if (!domain) {
      continue;
    }

    stateMap.set(column.id, {
      domain,
      scale: magnitude.scale ?? 'log',
    });
  }

  return stateMap;
}

function normalizeLinear(value: number, min: number, max: number): number {
  const span = max - min;

  if (span <= 0) {
    return 1;
  }

  return (value - min) / span;
}

function normalizeLog(value: number, min: number, max: number): number {
  const shift = min <= 0 ? 1 - min : 0;
  const shiftedValue = value + shift;
  const shiftedMin = min + shift;
  const shiftedMax = max + shift;

  if (shiftedValue <= 0 || shiftedMin <= 0 || shiftedMax <= 0) {
    return 0;
  }

  const denominator = Math.log(shiftedMax) - Math.log(shiftedMin);

  if (denominator <= 0) {
    return 1;
  }

  return (Math.log(shiftedValue) - Math.log(shiftedMin)) / denominator;
}

export function normalizeMagnitudeValue(
  value: number,
  domain: ColumnDomain,
  scale: DataTableMagnitudeScale,
): number {
  const boundedValue = Math.min(Math.max(value, domain.min), domain.max);
  const normalized =
    scale === 'linear'
      ? normalizeLinear(boundedValue, domain.min, domain.max)
      : normalizeLog(boundedValue, domain.min, domain.max);

  if (!Number.isFinite(normalized)) {
    return 0;
  }

  return Math.min(Math.max(normalized, 0), 1);
}

export function formatMagnitudeValueText(value: number): string {
  return `${Math.round(value)}%`;
}
