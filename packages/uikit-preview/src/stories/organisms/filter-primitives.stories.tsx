import {
  Chip,
  DataTable,
  FacetedMultiSelect,
  FilterProvider,
  RangeSlider,
  useDataTable,
  useFilterRange,
  useFilterState,
  useFilterValues,
  type FacetOption,
} from '@archon-research/design-system';
import { useMemo } from 'react';

import { css } from '../../../styled-system/css';

type Row = {
  id: string;
  category: string;
  region: string;
  amount: number;
};

const CATEGORIES = ['Alpha', 'Beta', 'Gamma', 'Delta'] as const;
const REGIONS = ['North', 'South', 'East', 'West'] as const;

const rows: Row[] = Array.from({ length: 120 }, (_, index) => ({
  id: `row-${String(index + 1).padStart(3, '0')}`,
  // The modulo keeps these in range; `[0]` is a typed fallback because the
  // tuples above are non-empty.
  category: CATEGORIES[index % CATEGORIES.length] ?? CATEGORIES[0],
  region:
    REGIONS[Math.floor(index / CATEGORIES.length) % REGIONS.length] ??
    REGIONS[0],
  amount: Math.round((Math.sin(index * 1.3) + 1) * 5000) + 100,
}));

const columns = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }: { row: { original: Row } }) => row.original.id,
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }: { row: { original: Row } }) => row.original.category,
  },
  {
    accessorKey: 'region',
    header: 'Region',
    cell: ({ row }: { row: { original: Row } }) => row.original.region,
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    meta: { align: 'right' as const, mono: true },
    cell: ({ row }: { row: { original: Row } }) =>
      row.original.amount.toLocaleString('en-US'),
  },
];

function matchesFilters(
  row: Row,
  categoryValues: string[],
  amountRange: { min: number; max: number } | null,
): boolean {
  if (categoryValues.length > 0 && !categoryValues.includes(row.category)) {
    return false;
  }
  if (
    amountRange &&
    (row.amount < amountRange.min || row.amount > amountRange.max)
  ) {
    return false;
  }
  return true;
}

function buildCategoryOptions(rowsInScope: Row[]): FacetOption[] {
  const counts = new Map<string, number>();
  for (const row of rowsInScope) {
    counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
  }
  return CATEGORIES.map((value) => ({
    value,
    count: counts.get(value) ?? 0,
  }));
}

const AMOUNT_BOUNDS = { min: 100, max: 10100 };

function FilterBarDashboard() {
  const { fields, clearAll } = useFilterState();
  const category = useFilterValues('category');
  const amount = useFilterRange('amount');

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => matchesFilters(row, category.values, amount.range)),
    [category.values, amount.range],
  );

  const table = useDataTable(filteredRows, columns as never, {
    enableSorting: true,
  });

  const hasActiveFilters = Object.keys(fields).length > 0;
  const amountValue = amount.range ?? AMOUNT_BOUNDS;

  return (
    <div
      className={css({
        display: 'grid',
        gridTemplateColumns: '16rem 1fr',
        gap: '6',
        p: '6',
        maxWidth: '5xl',
      })}
    >
      <div className={css({ display: 'grid', gap: '6' })}>
        <FacetedMultiSelect
          label="Category"
          options={buildCategoryOptions(rows)}
          values={category.values}
          onToggle={category.toggle}
          onClear={category.clear}
        />
        <RangeSlider
          label="Amount"
          min={AMOUNT_BOUNDS.min}
          max={AMOUNT_BOUNDS.max}
          step={100}
          value={amountValue}
          onChange={amount.setRange}
        />
      </div>

      <div className={css({ display: 'grid', gap: '4' })}>
        <div
          className={css({
            display: 'flex',
            flexWrap: 'wrap',
            gap: '2',
            alignItems: 'center',
            minHeight: '8',
          })}
        >
          {category.values.map((value) => (
            <Chip key={value} onRemove={() => category.toggle(value)}>
              {value}
            </Chip>
          ))}
          {amount.range ? (
            <Chip onRemove={amount.clear}>
              {amount.range.min.toLocaleString('en-US')} –{' '}
              {amount.range.max.toLocaleString('en-US')}
            </Chip>
          ) : null}
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearAll}
              className={css({
                fontSize: 'xs',
                color: 'text.interactive',
                bg: 'none',
                border: 'none',
                cursor: 'pointer',
                _hover: { textDecoration: 'underline' },
              })}
            >
              Clear all
            </button>
          ) : null}
        </div>

        <DataTable
          table={table}
          isLoading={false}
          getRowKey={(row: Row) => row.id}
          maxHeight="480px"
        />
      </div>
    </div>
  );
}

export default {
  title: 'Organisms/Filter Primitives',
};

export const FilterBar = () => (
  <FilterProvider>
    <FilterBarDashboard />
  </FilterProvider>
);
