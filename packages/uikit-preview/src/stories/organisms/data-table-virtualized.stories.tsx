import { DataTable, useDataTable } from '@archon-research/design-system';
import { useEffect, useState } from 'react';

import { css } from '../../../styled-system/css';

type Row = {
  id: string;
  category: string;
  region: string;
  value: number;
};

const CATEGORIES = ['Alpha', 'Beta', 'Gamma', 'Delta'];
const REGIONS = ['North', 'South', 'East', 'West'];

function buildRows(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => {
    const category = CATEGORIES[index % CATEGORIES.length];
    const region =
      REGIONS[Math.floor(index / CATEGORIES.length) % REGIONS.length];

    return {
      id: `row-${String(index + 1).padStart(4, '0')}`,
      category,
      region,
      value: Math.round((Math.sin(index) + 1) * 5000) + 100,
    };
  });
}

const rows = buildRows(2000);

const columns = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }: { row: { original: Row } }) => row.original.id,
  },
  {
    accessorKey: 'category',
    header: 'Category',
    filterFn: 'equalsString' as const,
    meta: { filterVariant: 'select' as const },
    cell: ({ row }: { row: { original: Row } }) => row.original.category,
  },
  {
    accessorKey: 'region',
    header: 'Region',
    filterFn: 'equalsString' as const,
    meta: { filterVariant: 'select' as const },
    cell: ({ row }: { row: { original: Row } }) => row.original.region,
  },
  {
    accessorKey: 'value',
    header: 'Value',
    meta: { align: 'right' as const, mono: true },
    cell: ({ row }: { row: { original: Row } }) =>
      row.original.value.toLocaleString('en-US'),
  },
];

export default {
  title: 'Organisms/Data Table Virtualized',
};

const wrapperClassName = css({
  p: '6',
  maxWidth: '4xl',
});

export const VirtualizedWithFacetedFilters = () => {
  const table = useDataTable(rows, columns as never, {
    enableSorting: true,
  });

  return (
    <div className={wrapperClassName}>
      <div className={css({ fontSize: 'sm', color: 'text.muted', mb: '4' })}>
        2,000 rows rendered through <code>virtualized</code> with a sticky
        header. The Category and Region columns use{' '}
        <code>meta.filterVariant: &apos;select&apos;</code>, populated from{' '}
        <code>column.getFacetedUniqueValues()</code>.
      </div>
      <DataTable
        table={table}
        isLoading={false}
        getRowKey={(row: Row) => row.id}
        virtualized
        maxHeight="480px"
      />
    </div>
  );
};

export const FlashOnUpdate = () => {
  const [data, setData] = useState(() => buildRows(30));
  const table = useDataTable(data, columns as never, {
    enableSorting: true,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setData((previous) =>
        previous.map((row) =>
          Math.random() < 0.2
            ? {
                ...row,
                value: Math.max(
                  0,
                  row.value +
                    (Math.random() < 0.5 ? -1 : 1) *
                      Math.round(Math.random() * 800),
                ),
              }
            : row,
        ),
      );
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={wrapperClassName}>
      <div className={css({ fontSize: 'sm', color: 'text.muted', mb: '4' })}>
        A subset of rows updates every ~1.2s. <code>flashOnUpdate</code>{' '}
        highlights any body cell whose value changed since the previous render,
        tinted by inferred direction (increase/decrease).
      </div>
      <DataTable
        table={table}
        isLoading={false}
        getRowKey={(row: Row) => row.id}
        flashOnUpdate
      />
    </div>
  );
};

export const FlashOnUpdateTwoPhase = () => {
  const [data, setData] = useState(() => buildRows(30));
  const table = useDataTable(data, columns as never, {
    enableSorting: true,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setData((previous) =>
        previous.map((row) =>
          Math.random() < 0.2
            ? {
                ...row,
                value: Math.max(
                  0,
                  row.value +
                    (Math.random() < 0.5 ? -1 : 1) *
                      Math.round(Math.random() * 800),
                ),
              }
            : row,
        ),
      );
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={wrapperClassName}>
      <div className={css({ fontSize: 'sm', color: 'text.muted', mb: '4' })}>
        Same live-update pattern as <code>FlashOnUpdate</code>, but with{' '}
        <code>flashOnUpdate=&quot;two-phase&quot;</code>: the tint holds at full
        strength (~400ms) then fades independently (~900ms), as an alpha-tinted
        up/down background rather than a solid fill.
      </div>
      <DataTable
        table={table}
        isLoading={false}
        getRowKey={(row: Row) => row.id}
        flashOnUpdate="two-phase"
      />
    </div>
  );
};
